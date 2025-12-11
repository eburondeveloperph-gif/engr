import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Users, Plus, Search, FileText, ArrowDownCircle, ArrowUpCircle, Wallet } from 'lucide-react';
import { Customer, CustomerTransaction } from '../types';

export const Customers: React.FC = () => {
  const { customers, customerTransactions, addCustomer, addCustomerTransaction } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  // Transaction Form State
  const [isTransModalOpen, setIsTransModalOpen] = useState(false);
  const [transType, setTransType] = useState<'CHARGE' | 'DEPOSIT'>('CHARGE');

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.contact.includes(searchTerm)
  );

  const getCustomerBalance = (customerId: string) => {
    const txs = customerTransactions.filter(t => t.customerId === customerId);
    const charges = txs.filter(t => t.type === 'CHARGE').reduce((sum, t) => sum + t.amount, 0);
    const deposits = txs.filter(t => t.type === 'DEPOSIT').reduce((sum, t) => sum + t.amount, 0);
    return {
      balance: charges - deposits, // Positive means they owe money
      totalCharges: charges,
      totalDeposits: deposits
    };
  };

  const handleAddCustomer = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    addCustomer({
      id: Date.now().toString(),
      name: formData.get('name') as string,
      contact: formData.get('contact') as string,
      address: formData.get('address') as string,
    });
    setIsAddModalOpen(false);
  };

  const handleAddTransaction = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    const formData = new FormData(e.currentTarget);
    addCustomerTransaction({
      id: Date.now().toString(),
      customerId: selectedCustomer.id,
      type: transType,
      amount: Number(formData.get('amount')),
      description: formData.get('description') as string,
      date: new Date().toISOString()
    });
    setIsTransModalOpen(false);
  };

  // View: Ledger for a selected customer
  if (selectedCustomer) {
    const txs = customerTransactions.filter(t => t.customerId === selectedCustomer.id);
    const { balance, totalCharges, totalDeposits } = getCustomerBalance(selectedCustomer.id);

    return (
      <div className="h-full flex flex-col bg-slate-50">
        {/* Header */}
        <div className="bg-white p-4 border-b border-slate-200 flex justify-between items-center shadow-sm">
          <div>
             <button onClick={() => setSelectedCustomer(null)} className="text-sm text-slate-500 hover:text-orange-600 mb-1">← Back to List</button>
             <h2 className="text-xl font-bold text-slate-800">{selectedCustomer.name}</h2>
             <div className="text-xs text-slate-500">{selectedCustomer.address} • {selectedCustomer.contact}</div>
          </div>
          <div className="text-right">
             <div className="text-xs text-slate-400 uppercase tracking-wider">Current Balance</div>
             <div className={`text-2xl font-bold ${balance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                {balance > 0 ? `(Debt) ₱${balance.toLocaleString()}` : `(Credit) ₱${Math.abs(balance).toLocaleString()}`}
             </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 p-4">
           <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400 uppercase">Total Billing (Charges)</div>
                <div className="text-lg font-bold text-slate-800">₱{totalCharges.toLocaleString()}</div>
              </div>
              <ArrowUpCircle className="text-orange-500 opacity-50" />
           </div>
           <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400 uppercase">Total Paid (Deposits)</div>
                <div className="text-lg font-bold text-green-600">₱{totalDeposits.toLocaleString()}</div>
              </div>
              <ArrowDownCircle className="text-green-500 opacity-50" />
           </div>
        </div>

        {/* Actions */}
        <div className="px-4 flex gap-2 mb-4">
           <button 
             onClick={() => { setTransType('CHARGE'); setIsTransModalOpen(true); }}
             className="flex-1 bg-orange-100 text-orange-700 py-2 rounded-lg font-semibold hover:bg-orange-200 transition-colors flex items-center justify-center gap-2"
           >
             <Plus size={16} /> Add Charge (Bill)
           </button>
           <button 
             onClick={() => { setTransType('DEPOSIT'); setIsTransModalOpen(true); }}
             className="flex-1 bg-green-100 text-green-700 py-2 rounded-lg font-semibold hover:bg-green-200 transition-colors flex items-center justify-center gap-2"
           >
             <Wallet size={16} /> Add Deposit (Pay)
           </button>
        </div>

        {/* Ledger List */}
        <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-2">
           <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-2">Transaction History</h3>
           {txs.length === 0 && <div className="text-center text-slate-400 py-8">No transactions yet.</div>}
           {txs.map(tx => (
             <div key={tx.id} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center">
                <div className="flex items-center gap-3">
                   <div className={`p-2 rounded-full ${tx.type === 'CHARGE' ? 'bg-orange-50 text-orange-500' : 'bg-green-50 text-green-500'}`}>
                      {tx.type === 'CHARGE' ? <FileText size={16} /> : <Wallet size={16} />}
                   </div>
                   <div>
                      <div className="font-medium text-slate-800">{tx.description}</div>
                      <div className="text-xs text-slate-500">{new Date(tx.date).toLocaleDateString()}</div>
                   </div>
                </div>
                <div className={`font-bold ${tx.type === 'CHARGE' ? 'text-slate-800' : 'text-green-600'}`}>
                   {tx.type === 'CHARGE' ? '+' : '-'} ₱{tx.amount.toLocaleString()}
                </div>
             </div>
           ))}
        </div>

        {/* Add Transaction Modal */}
        {isTransModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className={`p-4 border-b flex justify-between items-center ${transType === 'CHARGE' ? 'bg-orange-50' : 'bg-green-50'}`}>
              <h3 className={`font-bold text-lg ${transType === 'CHARGE' ? 'text-orange-800' : 'text-green-800'}`}>
                {transType === 'CHARGE' ? 'Add To Bill' : 'Record Payment'}
              </h3>
              <button onClick={() => setIsTransModalOpen(false)} className="text-slate-400 hover:text-slate-600"><Plus className="rotate-45" /></button>
            </div>
            <form onSubmit={handleAddTransaction} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Amount (₱)</label>
                <input required type="number" step="0.01" name="amount" className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-slate-900" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <input required name="description" placeholder={transType === 'CHARGE' ? "e.g. 50 bags cement" : "e.g. Downpayment"} className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-slate-900" />
              </div>
              <button type="submit" className={`w-full text-white py-3 rounded-lg font-semibold transition-colors mt-2 ${transType === 'CHARGE' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'}`}>
                Confirm {transType === 'CHARGE' ? 'Charge' : 'Deposit'}
              </button>
            </form>
          </div>
        </div>
        )}
      </div>
    );
  }

  // View: Customer List
  return (
    <div className="h-full flex flex-col bg-slate-50 p-4 pb-24">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Users className="text-orange-600" /> Builders & Billing
        </h2>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm hover:bg-orange-700 active:scale-95 transition-all"
        >
          <Plus size={18} /> New Builder
        </button>
      </div>

      <div className="bg-white p-3 rounded-xl shadow-sm mb-4 border border-slate-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Search builders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-lg border-none focus:ring-2 focus:ring-orange-500 outline-none text-slate-700"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar space-y-3">
        {filteredCustomers.length === 0 && (
            <div className="text-center py-10 text-slate-400">No builders registered yet.</div>
        )}
        {filteredCustomers.map(customer => {
           const { balance } = getCustomerBalance(customer.id);
           return (
            <div 
                key={customer.id} 
                onClick={() => setSelectedCustomer(customer)}
                className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center cursor-pointer hover:border-orange-300 transition-all"
            >
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                      {customer.name.charAt(0)}
                   </div>
                   <div>
                    <div className="font-semibold text-slate-800">{customer.name}</div>
                    <div className="text-xs text-slate-500">{customer.contact}</div>
                   </div>
                </div>
                <div className="text-right">
                    <div className={`font-bold ${balance > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                        {balance > 0 ? `₱${balance.toLocaleString()}` : 'Paid'}
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">Balance</div>
                </div>
            </div>
           );
        })}
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">Register New Builder</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600"><Plus className="rotate-45" /></button>
            </div>
            <form onSubmit={handleAddCustomer} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Builder Name</label>
                <input required name="name" className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-slate-900" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Contact Number</label>
                <input required name="contact" className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-slate-900" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Address / Site Location</label>
                <input required name="address" className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-slate-900" />
              </div>
              <button type="submit" className="w-full bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors mt-2">
                Register Builder
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};