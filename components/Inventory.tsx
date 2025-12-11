import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Package, Plus, Search, Edit2, AlertTriangle } from 'lucide-react';
import { Product } from '../types';

export const Inventory: React.FC = () => {
  const { inventory, addProduct, updateProduct } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Product | null>(null);

  const filteredItems = inventory.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const productData = {
      name: formData.get('name') as string,
      category: formData.get('category') as string,
      price: Number(formData.get('price')),
      stock: Number(formData.get('stock')),
      unit: formData.get('unit') as string,
    };

    if (editingItem) {
      updateProduct(editingItem.id, productData);
    } else {
      addProduct({
        id: Date.now().toString(),
        ...productData
      });
    }
    setIsModalOpen(false);
    setEditingItem(null);
  };

  return (
    <div className="p-4 h-full flex flex-col bg-slate-100">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Package className="text-orange-600" /> Inventory
        </h2>
        <button 
          onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
          className="bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm hover:bg-orange-700 active:scale-95 transition-all"
        >
          <Plus size={18} /> Add Stock
        </button>
      </div>

      <div className="bg-white p-3 rounded-xl shadow-sm mb-4 border border-slate-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-lg border-none focus:ring-2 focus:ring-orange-500 outline-none text-slate-700"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pb-24">
        {filteredItems.map(item => (
          <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center">
            <div>
              <div className="font-semibold text-slate-800">{item.name}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wide">{item.category}</div>
              <div className="text-sm font-medium text-slate-600 mt-1">
                ₱{item.price.toFixed(2)} / {item.unit}
              </div>
            </div>
            <div className="text-right">
              <div className={`text-xl font-bold ${item.stock < 50 ? 'text-red-500' : 'text-slate-700'}`}>
                {item.stock}
              </div>
              <div className="text-xs text-slate-400 mb-2">In Stock</div>
              <button 
                onClick={() => { setEditingItem(item); setIsModalOpen(true); }}
                className="p-2 bg-slate-100 rounded-full text-slate-600 hover:bg-orange-100 hover:text-orange-600 transition-colors"
              >
                <Edit2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {filteredItems.length === 0 && (
          <div className="text-center py-10 text-slate-400">
            No items found.
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">{editingItem ? 'Edit Item' : 'New Stock'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><Plus className="rotate-45" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Item Name</label>
                <input required name="name" defaultValue={editingItem?.name} className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 placeholder:text-slate-400" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <input required name="category" defaultValue={editingItem?.category} className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 placeholder:text-slate-400" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Unit</label>
                  <input required name="unit" defaultValue={editingItem?.unit} placeholder="pc, kg, bag" className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 placeholder:text-slate-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Price (₱)</label>
                  <input required type="number" step="0.01" name="price" defaultValue={editingItem?.price} className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 placeholder:text-slate-400" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Stock Qty</label>
                  <input required type="number" name="stock" defaultValue={editingItem?.stock} className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 placeholder:text-slate-400" />
                </div>
              </div>
              <button type="submit" className="w-full bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors mt-2">
                {editingItem ? 'Update Item' : 'Add to Inventory'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};