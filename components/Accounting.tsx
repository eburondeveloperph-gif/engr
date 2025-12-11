import React, { useState, useRef, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Camera, Upload, CheckCircle, Loader2, DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../services/supabaseClient';

export const Accounting: React.FC = () => {
  const { sales, expenses, addExpense } = useStore();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalSales - totalExpenses;

  // Monthly Calculations
  const monthlyStats = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const thisMonthSales = sales
      .filter(s => {
        const d = new Date(s.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, s) => sum + s.total, 0);

    const thisMonthExpenses = expenses
      .filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, e) => sum + e.amount, 0);

    return { revenue: thisMonthSales, expenses: thisMonthExpenses, profit: thisMonthSales - thisMonthExpenses };
  }, [sales, expenses]);

  // Chart Data
  const last7Days = Array.from({length: 7}, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  const chartData = last7Days.map(date => {
    const daySales = sales.filter(s => s.date.startsWith(date)).reduce((sum, s) => sum + s.total, 0);
    const dayExpenses = expenses.filter(e => e.date.startsWith(date)).reduce((sum, e) => sum + e.amount, 0);
    return { date: date.slice(5), sales: daySales, expenses: dayExpenses };
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    
    try {
      // 1. Upload to Supabase Storage
      const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, file);

      let publicUrl = '';
      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(fileName);
        publicUrl = urlData.publicUrl;
      } else {
          console.warn("Storage upload failed, proceeding without image URL", uploadError);
      }

      // 2. Read file for AI Analysis
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        
        try {
          if (!process.env.API_KEY) throw new Error("No API Key");
          
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          
          const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: {
              parts: [
                { inlineData: { mimeType: file.type, data: base64Data } },
                { text: "Analyze this receipt image. Extract the total amount, the merchant/store name (use 'Unknown' if not found), and the date (YYYY-MM-DD). Return JSON." }
              ]
            },
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  total: { type: Type.NUMBER },
                  merchant: { type: Type.STRING },
                  date: { type: Type.STRING }
                },
                required: ['total', 'merchant', 'date']
              }
            }
          });

          const result = JSON.parse(response.text || '{}');
          
          await addExpense({
            id: Date.now().toString(),
            date: result.date || new Date().toISOString(),
            description: `Receipt from ${result.merchant}`,
            amount: result.total || 0,
            category: 'Receipt Scan',
            receiptImage: publicUrl // Store Supabase URL
          });

        } catch (err) {
          console.error("Analysis failed", err);
          alert("Failed to analyze receipt.");
        } finally {
          setIsAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);

    } catch (err) {
        console.error("Upload failed", err);
        setIsAnalyzing(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-y-auto no-scrollbar pb-24">
      {/* Monthly Overview Card */}
      <div className="px-4 pt-4">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg">
           <div className="flex items-center gap-2 mb-4 opacity-80">
             <Calendar size={18} />
             <span className="text-sm font-semibold uppercase tracking-wider">
               {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })} Performance
             </span>
           </div>
           <div className="grid grid-cols-3 gap-4 text-center divide-x divide-slate-700">
              <div>
                 <div className="text-xs text-slate-400 mb-1">Revenue</div>
                 <div className="font-bold text-lg text-green-400">₱{monthlyStats.revenue.toLocaleString()}</div>
              </div>
              <div>
                 <div className="text-xs text-slate-400 mb-1">Expenses</div>
                 <div className="font-bold text-lg text-red-400">₱{monthlyStats.expenses.toLocaleString()}</div>
              </div>
              <div>
                 <div className="text-xs text-slate-400 mb-1">Profit</div>
                 <div className="font-bold text-lg text-white">₱{monthlyStats.profit.toLocaleString()}</div>
              </div>
           </div>
        </div>
      </div>

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Lifetime Revenue</div>
          <div className="text-2xl font-bold text-green-600 flex items-center gap-1">
             <DollarSign size={20} /> {totalSales.toLocaleString()}
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Lifetime Expenses</div>
          <div className="text-2xl font-bold text-red-500 flex items-center gap-1">
             <TrendingUp size={20} className="rotate-180" /> {totalExpenses.toLocaleString()}
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Net Profit</div>
          <div className="text-2xl font-bold text-slate-800">
             {netProfit.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="px-4 mb-4 h-64 w-full">
         <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 h-full">
           <ResponsiveContainer width="100%" height="100%">
             <BarChart data={chartData}>
               <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
               <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₱${val}`} />
               <Tooltip />
               <Bar dataKey="sales" fill="#f97316" radius={[4, 4, 0, 0]} />
               <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
             </BarChart>
           </ResponsiveContainer>
         </div>
      </div>

      {/* Receipt Scanner Actions */}
      <div className="px-4 mb-6">
        <div className="bg-slate-900 rounded-2xl p-6 text-white flex justify-between items-center shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="font-bold text-lg mb-1">Auto-Accounting</h3>
            <p className="text-slate-400 text-sm mb-4 max-w-xs">Snap a photo of your supplier receipts. Gemini AI will extract the data automatically.</p>
            <input 
              type="file" 
              accept="image/*" 
              capture="environment"
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isAnalyzing}
              className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {isAnalyzing ? <Loader2 className="animate-spin" /> : <Camera />}
              {isAnalyzing ? 'Analyzing...' : 'Scan & Save'}
            </button>
          </div>
          <div className="absolute -right-10 -bottom-10 opacity-20 text-orange-500">
             <Upload size={150} />
          </div>
        </div>
      </div>

      {/* Expenses List */}
      <div className="px-4 flex-1">
        <h3 className="font-bold text-slate-800 mb-4">Recent Expenses</h3>
        <div className="space-y-3">
          {expenses.length === 0 && <div className="text-slate-400 text-center py-4">No expenses recorded.</div>}
          {expenses.map(expense => (
            <div key={expense.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
               <div className="flex items-center gap-4">
                 {expense.receiptImage ? (
                   <img src={expense.receiptImage} alt="Receipt" className="w-10 h-10 object-cover rounded-lg border border-slate-200" />
                 ) : (
                   <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400"><DollarSign size={16}/></div>
                 )}
                 <div>
                   <div className="font-medium text-slate-800">{expense.description}</div>
                   <div className="text-xs text-slate-500">{new Date(expense.date).toLocaleDateString()}</div>
                 </div>
               </div>
               <div className="font-bold text-red-500">-₱{expense.amount.toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};