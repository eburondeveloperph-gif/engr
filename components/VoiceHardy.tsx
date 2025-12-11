import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Mic, MicOff, Volume2, Loader2, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { base64ToUint8Array, createPcmBlob, decodeAudioData } from '../services/audioUtils';
import { SYSTEM_INSTRUCTION_HARDY } from '../constants';

const API_KEY = process.env.API_KEY || '';

export const VoiceHardy: React.FC = () => {
  const { inventory, sales, expenses, getFormattedInventory } = useStore();
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [volume, setVolume] = useState(0); // For visualizing voice activity
  
  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // GenAI Refs
  const sessionRef = useRef<any>(null); // To hold the active session promise/object

  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, []);

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

  const initializeAudio = async () => {
    cleanupAudio();
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    audioContextRef.current = ctx;
    nextStartTimeRef.current = ctx.currentTime;
    return ctx;
  };

  const connectToGemini = async () => {
    if (!API_KEY) {
      alert("Please provide a valid API Key in the environment.");
      return;
    }
    setIsConnecting(true);

    try {
      const ctx = await initializeAudio();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Input handling (Microphone -> Gemini)
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const source = inputCtx.createMediaStreamSource(stream);
      const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
      
      inputSourceRef.current = source;
      processorRef.current = scriptProcessor;

      const ai = new GoogleGenAI({ apiKey: API_KEY });

      // Define Tools for Hardy
      const tools = [{
        functionDeclarations: [
          {
            name: "getInventorySummary",
            description: "Get a summary of all items in the inventory and their stock levels.",
          },
          {
            name: "getLowStockAlerts",
            description: "Get a list of items that have low stock (less than 50).",
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
            
            // Start audio processing pipeline
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              // Calculate volume for visualization
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
              setVolume(Math.sqrt(sum / inputData.length) * 5); // Scale up a bit

              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio Output
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

            // Handle Interruption
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = ctx.currentTime;
            }

            // Handle Function Calls
            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                 let result = {};
                 if (fc.name === 'getInventorySummary') {
                    // We need real-time data from the store.
                    // Since this callback is a closure, we might need a ref if we want *live* state update,
                    // but for this demo, fetching from context via a helper or just re-reading current state 
                    // (which might be stale inside callback) is a common issue.
                    // However, we can use the `getFormattedInventory` from the closure scope if it updates,
                    // or better, pass the latest state if possible. 
                    // In this simple setup, we'll try to use the function available in scope.
                    // *Self-Correction*: The closure captures the initial state. 
                    // We'll trust that for this specific component structure, or use a Ref for inventory.
                    // For safety, let's just grab the items from localStorage directly for fresh data.
                    const inv = JSON.parse(localStorage.getItem('inventory') || '[]');
                    result = { summary: inv.map((i:any) => `${i.name}: ${i.stock} ${i.unit}`).join(', ') };
                 } else if (fc.name === 'getLowStockAlerts') {
                    const inv = JSON.parse(localStorage.getItem('inventory') || '[]');
                    const low = inv.filter((i:any) => i.stock < 50);
                    result = { lowStockItems: low.map((i:any) => i.name).join(', ') || "None" };
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
          },
          onerror: (err) => {
            console.error("Gemini Live Error", err);
            setIsActive(false);
            setIsConnecting(false);
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
    setIsActive(false);
  };

  if (isActive) {
    return (
      <div className="fixed bottom-20 right-4 z-50 flex flex-col items-center gap-2 animate-in slide-in-from-bottom duration-300">
        <div className="bg-slate-900 text-white p-4 rounded-full shadow-2xl flex items-center gap-4 border border-orange-500/50">
          <div 
            className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center transition-all"
            style={{ transform: `scale(${1 + Math.min(volume, 0.5)})` }}
          >
            <Volume2 className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-orange-400">Hardy</span>
            <span className="text-xs text-slate-400">Listening...</span>
          </div>
          <button 
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
      onClick={connectToGemini}
      disabled={isConnecting}
      className={`fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all ${
        isConnecting ? 'bg-slate-700 cursor-wait' : 'bg-gradient-to-r from-orange-600 to-amber-600 hover:scale-105 active:scale-95'
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
