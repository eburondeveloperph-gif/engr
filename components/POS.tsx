import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Product, SaleItem, Sale } from '../types';
import { ShoppingCart, Plus, Minus, Trash2, Printer, CheckCircle, Cloud } from 'lucide-react';

export const POS: React.FC = () => {
  const { inventory, recordSale } = useStore();
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => item.productId === product.id 
          ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.price } 
          : item
        );
      }
      return [...prev, { productId: product.id, name: product.name, quantity: 1, price: product.price, subtotal: product.price }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty, subtotal: newQty * item.price };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    const saleId = Date.now().toString();
    const newSale: Sale = {
      id: saleId,
      date: new Date().toISOString(),
      items: [...cart],
      total: cartTotal
    };
    
    await recordSale(newSale); // Waits for Supabase insert
    setLastSale(newSale);
    setShowReceipt(true);
    setCart([]);
  };

  if (showReceipt && lastSale) {
    return (
      <div className="p-4 h-full flex flex-col items-center justify-center bg-slate-100">
        <div className="bg-white p-8 w-full max-w-sm shadow-xl rounded-none border-t-8 border-orange-500 relative print-area">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold uppercase tracking-wider text-slate-800">Engr Quilang</h1>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Hardware Supply</p>
            <p className="text-xs text-slate-600">Cabbo Penablanca, Cagayan</p>
            <p className="text-xs text-slate-600 mb-2">+639955597560</p>
            <div className="w-full border-b border-slate-200 mb-2"></div>
            <p className="text-xs text-slate-400 mt-1">{new Date(lastSale.date).toLocaleString()}</p>
            <p className="text-xs text-slate-400">Order ID: #{lastSale.id.slice(-6)}</p>
          </div>
          
          <div className="border-t border-b border-dashed border-slate-300 py-4 my-4 space-y-2">
             {lastSale.items.map((item, idx) => (
               <div key={idx} className="flex justify-between items-start text-sm">
                  <div className="flex flex-col">
                    <span className="text-slate-800 font-medium">{item.name}</span>
                    <span className="text-xs text-slate-500">{item.quantity} x ₱{item.price.toFixed(2)}</span>
                  </div>
                  <span className="font-semibold text-slate-700">₱{item.subtotal.toFixed(2)}</span>
               </div>
             ))}
             
             <div className="border-t border-slate-200 mt-4 pt-2"></div>
             
             <div className="flex justify-between font-bold text-xl mt-2 text-slate-800">
               <span>TOTAL</span>
               <span>₱{lastSale.total.toFixed(2)}</span>
             </div>
          </div>
          
          <div className="text-center text-xs text-slate-400 mt-6">
            <p>Thank you for your business, Boss!</p>
            <p className="mt-1">Returns within 7 days with receipt.</p>
            <p className="mt-6 font-bold text-slate-300 uppercase tracking-widest text-[10px]">Powered by Aitek</p>
          </div>
          
          <div className="absolute top-0 right-0 p-2 no-print">
             <div className="bg-green-100 text-green-700 text-[10px] px-2 py-1 rounded-full flex items-center gap-1">
                <Cloud size={10} /> Saved to DB
             </div>
          </div>
          
          <button 
            onClick={() => { setShowReceipt(false); setLastSale(null); }}
            className="absolute top-2 left-2 text-slate-300 hover:text-slate-500 no-print"
          >
            <Minus />
          </button>
        </div>
        <div className="mt-6 flex gap-4">
          <button onClick={() => window.print()} className="flex items-center gap-2 bg-slate-800 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-slate-900 transition-colors">
            <Printer size={18} /> Print Invoice
          </button>
          <button onClick={() => { setShowReceipt(false); setLastSale(null); }} className="px-6 py-3 rounded-lg text-slate-600 hover:bg-slate-200 transition-colors">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col md:flex-row bg-slate-100 overflow-hidden">
      {/* Product Grid */}
      <div className="flex-1 p-4 flex flex-col h-full overflow-hidden">
         <div className="mb-4">
            <input 
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 shadow-sm focus:ring-2 focus:ring-orange-500 outline-none"
            />
         </div>
         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 overflow-y-auto no-scrollbar pb-24">
            {inventory.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(product => (
              <button 
                key={product.id}
                onClick={() => addToCart(product)}
                disabled={product.stock <= 0}
                className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-start hover:border-orange-300 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="font-bold text-slate-800 text-sm line-clamp-2">{product.name}</div>
                <div className="text-xs text-slate-500 mt-1">{product.stock} {product.unit} left</div>
                <div className="mt-auto pt-2 font-bold text-orange-600">₱{product.price}</div>
              </button>
            ))}
         </div>
      </div>

      {/* Cart Sidebar */}
      <div className="w-full md:w-96 bg-white shadow-xl flex flex-col border-l border-slate-200 h-[40vh] md:h-full z-10">
        <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-700 flex items-center gap-2">
          <ShoppingCart size={18} /> Current Order
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center text-slate-400 mt-10 text-sm">Cart is empty</div>
          ) : (
            cart.map(item => (
              <div key={item.productId} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-slate-800 text-sm">{item.name}</div>
                  <div className="text-xs text-slate-500">₱{item.price} x {item.quantity}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 bg-white rounded border border-slate-200">
                     <button onClick={() => updateQuantity(item.productId, -1)} className="p-1 hover:bg-slate-100"><Minus size={12}/></button>
                     <span className="text-xs w-6 text-center font-medium">{item.quantity}</span>
                     <button onClick={() => updateQuantity(item.productId, 1)} className="p-1 hover:bg-slate-100"><Plus size={12}/></button>
                  </div>
                  <button onClick={() => removeFromCart(item.productId)} className="text-red-400 hover:text-red-600">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <div className="flex justify-between items-center mb-4">
            <span className="text-slate-500">Total</span>
            <span className="text-2xl font-bold text-slate-800">₱{cartTotal.toFixed(2)}</span>
          </div>
          <button 
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-orange-700 disabled:bg-slate-300 disabled:shadow-none transition-all active:scale-95"
          >
            Confirm Payment
          </button>
        </div>
      </div>
    </div>
  );
};