import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { GoogleGenAI } from '@google/genai';
import { BrainCircuit, Loader2, Sparkles, Send } from 'lucide-react';

export const Consultant: React.FC = () => {
  const { getFormattedInventory, sales, expenses } = useStore();
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleConsult = async () => {
    if (!query.trim() || !process.env.API_KEY) return;
    setIsLoading(true);
    setResponse('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Prepare context data
      const salesSummary = `Total Sales: ${sales.length}, Revenue: ₱${sales.reduce((a,b)=>a+b.total,0)}`;
      const inventorySummary = getFormattedInventory();
      
      const prompt = `
        Context:
        I run a hardware store "Engr Quilang Hardware".
        Inventory: ${inventorySummary}
        Sales Summary: ${salesSummary}
        
        User Query: ${query}
        
        Provide a strategic, deep analysis response. Be professional but helpful.
      `;

      // Using Gemini 3 Pro Preview with Thinking Budget for complex reasoning
      const result = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingBudget: 32768 },
        }
      });
      
      setResponse(result.text || "I couldn't generate a strategy at this moment.");

    } catch (e) {
      console.error(e);
      setResponse("Consultation failed. Please check connection.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 p-4 pb-24">
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white mb-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold flex items-center gap-2 mb-2"><BrainCircuit /> Business Strategist</h2>
          <p className="text-indigo-100 text-sm max-w-md">
            Uses Aitek 3 Pro with deep reasoning (Thinking Mode) to analyze your business data and answer complex strategic questions.
          </p>
        </div>
        <Sparkles className="absolute right-[-20px] top-[-20px] text-white opacity-10 w-40 h-40" />
      </div>

      <div className="flex-1 overflow-y-auto mb-4">
        {response ? (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 prose prose-slate max-w-none">
             <div className="text-xs font-bold text-indigo-600 uppercase mb-2">AI Analysis</div>
             <div className="whitespace-pre-wrap text-slate-700 leading-relaxed">{response}</div>
          </div>
        ) : (
           <div className="flex flex-col items-center justify-center h-full text-slate-400">
             <BrainCircuit size={48} className="mb-4 opacity-20" />
             <p>Ask about market trends, inventory optimization, or sales strategy.</p>
           </div>
        )}
      </div>

      <div className="bg-white p-2 rounded-2xl shadow-lg border border-slate-200 flex items-center gap-2">
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. How can I optimize my cement stock based on sales?"
          className="flex-1 p-3 outline-none text-slate-700 bg-transparent"
          onKeyDown={(e) => e.key === 'Enter' && handleConsult()}
        />
        <button 
          onClick={handleConsult}
          disabled={isLoading || !query}
          className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 disabled:bg-slate-300 transition-colors"
        >
          {isLoading ? <Loader2 className="animate-spin" /> : <Send size={20} />}
        </button>
      </div>
    </div>
  );
};