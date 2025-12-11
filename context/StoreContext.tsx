import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, Sale, Expense } from '../types';
import { INITIAL_INVENTORY } from '../constants';

interface StoreContextType {
  inventory: Product[];
  sales: Sale[];
  expenses: Expense[];
  addProduct: (product: Product) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  recordSale: (sale: Sale) => void;
  addExpense: (expense: Expense) => void;
  getFormattedInventory: () => string;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [inventory, setInventory] = useState<Product[]>(INITIAL_INVENTORY);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Load from local storage on mount (simulated)
  useEffect(() => {
    const savedInv = localStorage.getItem('inventory');
    if (savedInv) setInventory(JSON.parse(savedInv));

    const savedSales = localStorage.getItem('sales');
    if (savedSales) setSales(JSON.parse(savedSales));
    
    const savedExp = localStorage.getItem('expenses');
    if (savedExp) setExpenses(JSON.parse(savedExp));
  }, []);

  // Persist changes
  useEffect(() => {
    localStorage.setItem('inventory', JSON.stringify(inventory));
    localStorage.setItem('sales', JSON.stringify(sales));
    localStorage.setItem('expenses', JSON.stringify(expenses));
  }, [inventory, sales, expenses]);

  const addProduct = (product: Product) => {
    setInventory(prev => [...prev, product]);
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setInventory(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const recordSale = (sale: Sale) => {
    setSales(prev => [sale, ...prev]);
    // Deduct stock
    sale.items.forEach(item => {
      const product = inventory.find(p => p.id === item.productId);
      if (product) {
        updateProduct(product.id, { stock: product.stock - item.quantity });
      }
    });
  };

  const addExpense = (expense: Expense) => {
    setExpenses(prev => [expense, ...prev]);
  };

  const getFormattedInventory = () => {
    return inventory.map(i => `${i.name}: ${i.stock} ${i.unit} available`).join('\n');
  };

  return (
    <StoreContext.Provider value={{ inventory, sales, expenses, addProduct, updateProduct, recordSale, addExpense, getFormattedInventory }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
};