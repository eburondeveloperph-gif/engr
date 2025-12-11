import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';
import { Mic, MicOff, Volume2, Loader2, X, Camera, CameraOff, GripVertical } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { base64ToUint8Array, createPcmBlob, decodeAudioData } from '../services/audioUtils';
import { SYSTEM_INSTRUCTION_HARDY } from '../constants';
import { supabase } from '../services/supabaseClient';

const API_KEY = process.env.API_KEY || '';

export const VoiceHardy: React.FC = () => {
  const { inventory, sales, expenses } = useStore(); // We still use context for simple reactive updates if needed
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [volume, setVolume] = useState(0); 
  const [isCameraOn, setIsCameraOn] = useState(false);
  
  // Draggable State
  const [position, setPosition] = useState({ x: 20, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{x: number, y: number} | null>(null);
  
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

  // Draggable Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
    setIsDragging(false);
    
    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (dragStartRef.current) {
        const newX = moveEvent.clientX - dragStartRef.current.x;
        const newY = moveEvent.clientY - dragStartRef.current.y;
        
        // Simple distance check to differentiate click vs drag
        if (Math.abs(newX - position.x) > 5 || Math.abs(newY - position.y) > 5) {
            setIsDragging(true);
        }
        setPosition({ x: newX, y: newY });
      }
    };

    const handlePointerUp = () => {
      dragStartRef.current = null;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
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
    
    // Capture 1 frame every second (1 FPS) is usually sufficient for object ID without overloading
    frameIntervalRef.current = window.setInterval(() => {
      if (!videoRef.current || !canvasRef.current || !sessionRef.current) return;
      
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0);

      const base64Data = canvasRef.current.toDataURL('image/jpeg', 0.6).split(',')[1];
      
      sessionRef.current.then((session: any) => {
        session.sendRealtimeInput({ 
          media: { 
            mimeType: 'image/jpeg', 
            data: base64Data 
          } 
        });
      });

    }, 1000); 
  };

  const connectToGemini = async () => {
    if (isDragging) return; // Prevent click if dragging
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

      // Define Tools that query Supabase directly for realtime truth
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
            description: "Search for a customer/builder by name and get their current balance (debt or credit).",
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
                     // DIRECT DATABASE QUERIES FOR REALTIME CONTEXT
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
                            // Calculate debt manually via SQL or simple sum since we don't have a view
                            const { data: txs } = await supabase.from('customer_transactions').select('*').eq('customer_id', customer.id);
                            const charges = txs?.filter(t => t.type === 'CHARGE').reduce((sum, t) => sum + t.amount, 0) || 0;
                            const deposits = txs?.filter(t => t.type === 'DEPOSIT').reduce((sum, t) => sum + t.amount, 0) || 0;
                            const balance = charges - deposits;
                            result = {
                                name: customer.name,
                                balance: balance,
                                status: balance > 0 ? "Debt / Utang" : "Paid / Credit"
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
                     functionResponses: {
                       id: fc.id,
                       name: fc.name,
                       response: { result },
                     }
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
        className="fixed z-50 flex flex-col items-end gap-2 animate-in slide-in-from-bottom duration-300 touch-none"
        style={{ 
            right: `${position.x}px`, 
            bottom: `${position.y}px`,
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
            onPointerDown={(e) => e.stopPropagation()} // Prevent dragging when clicking buttons
            onClick={toggleCamera}
            className={`p-2 rounded-full transition-colors ${isCameraOn ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-800 text-slate-300 hover:text-white'}`}
          >
            {isCameraOn ? <CameraOff className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
          </button>

          <button 
            onPointerDown={(e) => e.stopPropagation()} // Prevent dragging when clicking buttons
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
        right: `${position.x}px`, 
        bottom: `${position.y}px`,
        transform: isDragging ? 'scale(0.95)' : 'scale(1)',
        touchAction: 'none'
      }}
      className={`fixed z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all ${
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