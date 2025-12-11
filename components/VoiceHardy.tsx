import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';
import { Mic, Loader2, X, Camera, CameraOff, GripVertical, Volume2 } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { base64ToUint8Array, createPcmBlob, decodeAudioData } from '../services/audioUtils';
import { SYSTEM_INSTRUCTION_HARDY } from '../constants';
import { supabase } from '../services/supabaseClient';

// Safe access to process.env
const API_KEY = (typeof process !== 'undefined' && process.env && process.env.API_KEY) || '';

export const VoiceHardy: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [volume, setVolume] = useState(0); 
  const [isCameraOn, setIsCameraOn] = useState(false);
  
  // Draggable State (Using Left/Top coordinates)
  const [position, setPosition] = useState(() => {
    if (typeof window !== 'undefined') {
        // Initial position: Bottom Right
        return { x: window.innerWidth - 80, y: window.innerHeight - 150 };
    }
    return { x: 0, y: 0 };
  });

  const [isDragging, setIsDragging] = useState(false);
  
  // Refs for Drag Logic
  const dragStartPosRef = useRef<{x: number, y: number} | null>(null);
  const dragOffsetRef = useRef<{x: number, y: number} | null>(null);
  const isDraggingRef = useRef(false);

  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Video Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const frameIntervalRef = useRef<number | null>(null);
  
  // GenAI Refs
  const sessionRef = useRef<any>(null); 

  useEffect(() => {
    return () => {
      cleanupAudio();
      cleanupVideo();
    };
  }, []);

  // --- Flawless Drag Logic ---
  const handlePointerDown = (e: React.PointerEvent) => {
    // Prevent default browser touch actions (scrolling)
    e.stopPropagation(); // Don't bubble to other elements
    
    const element = e.currentTarget as HTMLElement;
    const rect = element.getBoundingClientRect();
    
    // Calculate where inside the button we clicked (offset)
    dragOffsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    // Store initial click position to detect "intent to drag" vs "click"
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    
    isDraggingRef.current = false;
    
    // Attach listeners to window to handle fast movements outside the element
    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
  };

  const handleWindowPointerMove = (e: PointerEvent) => {
    if (!dragOffsetRef.current || !dragStartPosRef.current) return;

    // Check if moved enough to be considered a drag (threshold: 5px)
    const moveDist = Math.hypot(
        e.clientX - dragStartPosRef.current.x,
        e.clientY - dragStartPosRef.current.y
    );

    if (moveDist > 5 && !isDraggingRef.current) {
        isDraggingRef.current = true;
        setIsDragging(true);
    }

    if (isDraggingRef.current) {
        e.preventDefault();
        
        let newX = e.clientX - dragOffsetRef.current.x;
        let newY = e.clientY - dragOffsetRef.current.y;

        // Boundary Constraints
        const maxX = window.innerWidth - 60; // Button width approx
        const maxY = window.innerHeight - 60; // Button height approx
        
        // Clamp
        newX = Math.max(10, Math.min(newX, maxX));
        newY = Math.max(10, Math.min(newY, maxY));

        setPosition({ x: newX, y: newY });
    }
  };

  const handleWindowPointerUp = () => {
    window.removeEventListener('pointermove', handleWindowPointerMove);
    window.removeEventListener('pointerup', handleWindowPointerUp);
    
    dragOffsetRef.current = null;
    dragStartPosRef.current = null;
    
    // Small timeout to clear dragging state after the click event phase
    setTimeout(() => {
        setIsDragging(false);
        isDraggingRef.current = false;
    }, 50);
  };

  const cleanupAudio = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (inputSourceRef.current) {
      inputSourceRef.current.disconnect();
      inputSourceRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    sourcesRef.current.forEach(source => source.stop());
    sourcesRef.current.clear();
  };

  const cleanupVideo = () => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(track => track.stop());
      videoStreamRef.current = null;
    }
    setIsCameraOn(false);
  };

  const initializeAudio = async () => {
    cleanupAudio();
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    audioContextRef.current = ctx;
    nextStartTimeRef.current = ctx.currentTime;
    return ctx;
  };

  const toggleCamera = async () => {
    if (isCameraOn) {
      cleanupVideo();
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment',
            width: { ideal: 640 },
            height: { ideal: 480 }
          } 
        });
        videoStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setIsCameraOn(true);
        startFrameCapture();
      } catch (err) {
        console.error("Failed to access camera", err);
        alert("Could not access camera for vision features.");
      }
    }
  };

  const startFrameCapture = () => {
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    
    // Capture 1 frame every second
    frameIntervalRef.current = window.setInterval(() => {
      if (!videoRef.current || !canvasRef.current || !sessionRef.current) return;
      
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0);

      try {
          const base64Data = canvasRef.current.toDataURL('image/jpeg', 0.6).split(',')[1];
          sessionRef.current.then((session: any) => {
            session.sendRealtimeInput({ 
              media: { 
                mimeType: 'image/jpeg', 
                data: base64Data 
              } 
            });
          });
      } catch (e) {
          console.error("Frame capture error", e);
      }
    }, 1000); 
  };

  const connectToGemini = async () => {
    // Prevent connection if we were just dragging
    if (isDraggingRef.current) return;

    if (!API_KEY) {
      alert("Please provide a valid API Key in the environment.");
      return;
    }
    setIsConnecting(true);

    try {
      const ctx = await initializeAudio();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const source = inputCtx.createMediaStreamSource(stream);
      const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
      
      inputSourceRef.current = source;
      processorRef.current = scriptProcessor;

      const ai = new GoogleGenAI({ apiKey: API_KEY });

      const tools = [{
        functionDeclarations: [
          {
            name: "getInventorySummary",
            description: "Get a summary of all items in the inventory, their stock levels, and prices.",
          },
          {
            name: "getLowStockAlerts",
            description: "Get a list of items that have low stock (less than 50).",
          },
          {
            name: "getSalesPerformance",
            description: "Get the total revenue, total sales count, and recent sales data.",
          },
          {
             name: "searchProduct",
             description: "Search for a specific product price and stock by name.",
             parameters: {
                 type: Type.OBJECT,
                 properties: {
                     query: { type: Type.STRING, description: "The product name to search for" }
                 },
                 required: ["query"]
             }
          },
          {
            name: "getCustomerDebt",
            description: "Search for a customer/builder by name and get their financial summary: current balance, total charges, and total deposits.",
            parameters: {
                type: Type.OBJECT,
                properties: {
                    nameQuery: { type: Type.STRING, description: "The customer or builder name to search" }
                },
                required: ["nameQuery"]
            }
          },
          {
            name: "getCustomerTransactions",
            description: "Get the recent transaction history (charges and payments) for a specific customer/builder.",
            parameters: {
                type: Type.OBJECT,
                properties: {
                    nameQuery: { type: Type.STRING, description: "The customer or builder name to search" }
                },
                required: ["nameQuery"]
            }
          }
        ]
      }];

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } }
          },
          systemInstruction: SYSTEM_INSTRUCTION_HARDY,
          tools: tools,
        },
        callbacks: {
          onopen: () => {
            console.log("Connected to Hardy");
            setIsConnecting(false);
            setIsActive(true);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
              setVolume(Math.sqrt(sum / inputData.length) * 5); 

              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && ctx) {
               try {
                const audioBuffer = await decodeAudioData(
                  base64ToUint8Array(base64Audio),
                  ctx,
                  24000,
                  1
                );
                
                const sourceNode = ctx.createBufferSource();
                sourceNode.buffer = audioBuffer;
                sourceNode.connect(ctx.destination);
                
                const startTime = Math.max(ctx.currentTime, nextStartTimeRef.current);
                sourceNode.start(startTime);
                nextStartTimeRef.current = startTime + audioBuffer.duration;
                
                sourcesRef.current.add(sourceNode);
                sourceNode.onended = () => sourcesRef.current.delete(sourceNode);
              } catch (e) {
                console.error("Audio decode error", e);
              }
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = ctx.currentTime;
            }

            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                 let result = {};
                 
                 try {
                     if (fc.name === 'getInventorySummary') {
                        const { data } = await supabase.from('products').select('*');
                        if (data) {
                             const summary = data.map(i => `${i.name}: ${i.stock} ${i.unit} @ ₱${i.price}`).join(', ');
                             result = { summary };
                        }
                     } 
                     else if (fc.name === 'getLowStockAlerts') {
                        const { data } = await supabase.from('products').select('*').lt('stock', 50);
                        if (data) {
                            result = { lowStockItems: data.map(i => `${i.name} (${i.stock} left)`).join(', ') || "No items are low on stock." };
                        }
                     }
                     else if (fc.name === 'getSalesPerformance') {
                         const { data: salesData } = await supabase.from('sales').select('total');
                         const totalRevenue = salesData?.reduce((acc, curr) => acc + curr.total, 0) || 0;
                         const count = salesData?.length || 0;
                         result = { 
                             totalRevenue: `₱${totalRevenue.toLocaleString()}`, 
                             totalSalesCount: count,
                             message: totalRevenue > 10000 ? "Nakasta nay Boss! Good profit today." : "Need more push Boss."
                         };
                     }
                     else if (fc.name === 'searchProduct') {
                         const q = (fc.args as any).query;
                         const { data } = await supabase.from('products').select('*').ilike('name', `%${q}%`);
                         result = { found: data && data.length > 0 ? data : "No item found" };
                     }
                     else if (fc.name === 'getCustomerDebt') {
                        const q = (fc.args as any).nameQuery;
                        const { data: customers } = await supabase.from('customers').select('*').ilike('name', `%${q}%`);
                        if (customers && customers.length > 0) {
                            const customer = customers[0];
                            const { data: txs } = await supabase.from('customer_transactions').select('*').eq('customer_id', customer.id);
                            
                            const charges = txs?.filter(t => t.type === 'CHARGE').reduce((sum, t) => sum + t.amount, 0) || 0;
                            const deposits = txs?.filter(t => t.type === 'DEPOSIT').reduce((sum, t) => sum + t.amount, 0) || 0;
                            const balance = charges - deposits;
                            
                            result = {
                                name: customer.name,
                                totalCharges: `₱${charges.toLocaleString()}`,
                                totalDeposits: `₱${deposits.toLocaleString()}`,
                                currentBalance: `₱${Math.abs(balance).toLocaleString()}`,
                                status: balance > 0 ? "Has Debt (Utang)" : "Fully Paid / In Credit",
                                message: balance > 0 ? "Kailangan na maningil Boss!" : "Ayos, good payer si Boss."
                            };
                        } else {
                            result = { error: "Customer not found." };
                        }
                     }
                     else if (fc.name === 'getCustomerTransactions') {
                        const q = (fc.args as any).nameQuery;
                        const { data: customers } = await supabase.from('customers').select('*').ilike('name', `%${q}%`);
                        if (customers && customers.length > 0) {
                            const customer = customers[0];
                            const { data: txs } = await supabase
                                .from('customer_transactions')
                                .select('*')
                                .eq('customer_id', customer.id)
                                .order('date', { ascending: false })
                                .limit(5);

                            result = {
                                customer: customer.name,
                                recentTransactions: txs && txs.length > 0 
                                    ? txs.map(t => `${new Date(t.date).toLocaleDateString()}: ${t.type} ₱${t.amount} (${t.description})`) 
                                    : "No recent transactions."
                            };
                        } else {
                             result = { error: "Customer not found." };
                        }
                     }
                 } catch (err) {
                     console.error("Tool execution failed", err);
                     result = { error: "Database access error." };
                 }

                 sessionPromise.then(session => {
                   session.sendToolResponse({
                     functionResponses: [{
                       id: fc.id,
                       name: fc.name,
                       response: { result },
                     }]
                   });
                 });
              }
            }
          },
          onclose: () => {
            console.log("Disconnected");
            setIsActive(false);
            cleanupVideo();
          },
          onerror: (err) => {
            console.error("Gemini Live Error", err);
            setIsActive(false);
            setIsConnecting(false);
            cleanupVideo();
          }
        }
      });
      sessionRef.current = sessionPromise;

    } catch (error) {
      console.error("Connection failed", error);
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    if (sessionRef.current) {
      sessionRef.current.then((session: any) => session.close());
      sessionRef.current = null;
    }
    cleanupAudio();
    cleanupVideo();
    setIsActive(false);
  };

  if (isActive) {
    return (
      <div 
        className="fixed z-50 flex flex-col items-end gap-2 animate-in slide-in-from-bottom duration-300 touch-none select-none"
        style={{ 
            left: `${position.x}px`, 
            top: `${position.y}px`,
            cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onPointerDown={handlePointerDown}
      >
        {/* Video Preview */}
        <div className={`transition-all duration-300 overflow-hidden rounded-xl border border-orange-500/30 shadow-2xl bg-black ${isCameraOn ? 'w-32 h-44 mb-2' : 'w-0 h-0'}`}>
          <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="bg-slate-900 text-white p-4 rounded-3xl shadow-2xl flex items-center gap-4 border border-orange-500/50 relative group">
          
          {/* Grip Handle */}
          <div className="absolute -left-3 top-1/2 -translate-y-1/2 text-slate-500 opacity-50 group-hover:opacity-100">
             <GripVertical size={16} />
          </div>

          <div 
            className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center transition-all"
            style={{ transform: `scale(${1 + Math.min(volume, 0.5)})` }}
          >
            <Volume2 className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-orange-400">Hardy</span>
            <span className="text-xs text-slate-400">{isCameraOn ? "Watching..." : "Listening..."}</span>
          </div>
          
          <div className="h-8 w-px bg-slate-700 mx-1"></div>

          <button 
            onPointerDown={(e) => e.stopPropagation()} 
            onClick={toggleCamera}
            className={`p-2 rounded-full transition-colors ${isCameraOn ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-800 text-slate-300 hover:text-white'}`}
          >
            {isCameraOn ? <CameraOff className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
          </button>

          <button 
            onPointerDown={(e) => e.stopPropagation()} 
            onClick={disconnect}
            className="p-2 bg-slate-800 rounded-full hover:bg-red-500/20 text-slate-300 hover:text-red-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onPointerDown={handlePointerDown}
      onClick={connectToGemini}
      disabled={isConnecting}
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`,
        transform: isDragging ? 'scale(0.95)' : 'scale(1)',
        touchAction: 'none'
      }}
      className={`fixed z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all select-none ${
        isConnecting ? 'bg-slate-700 cursor-wait' : 'bg-gradient-to-r from-orange-600 to-amber-600 hover:shadow-orange-500/30'
      }`}
    >
      {isConnecting ? (
        <Loader2 className="w-6 h-6 text-white animate-spin" />
      ) : (
        <Mic className="w-6 h-6 text-white" />
      )}
    </button>
  );
};