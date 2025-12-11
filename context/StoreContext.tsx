import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, Sale, Expense } from '../types';
import { INITIAL_INVENTORY } from '../constants';
import { supabase } from '../services/supabaseClient';

interface StoreContextType {
  inventory: Product[];
  sales: Sale[];
  expenses: Expense[];
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  recordSale: (sale: Sale) => Promise<void>;
  addExpense: (expense: Expense) => Promise<void>;
  getFormattedInventory: () => string;
  isLoading: boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [inventory, setInventory] = useState<Product[]>(INITIAL_INVENTORY);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load from Supabase on mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch Inventory
        const { data: prodData } = await supabase.from('products').select('*');
        if (prodData && prodData.length > 0) {
          setInventory(prodData);
        } else {
            // Seed initial inventory if empty (optional, mostly for demo)
           // await supabase.from('products').insert(INITIAL_INVENTORY);
        }

        // Fetch Sales
        const { data: salesData } = await supabase.from('sales').select('*').order('date', { ascending: false });
        if (salesData) setSales(salesData);

        // Fetch Expenses
        const { data: expData } = await supabase.from('expenses').select('*').order('date', { ascending: false });
        if (expData) setExpenses(expData);

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const addProduct = async (product: Product) => {
    try {
        const { error } = await supabase.from('products').insert([product]);
        if (error) throw error;
        setInventory(prev => [...prev, product]);
    } catch (e) {
        console.error("Failed to add product", e);
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    try {
        const { error } = await supabase.from('products').update(updates).eq('id', id);
        if (error) throw error;
        setInventory(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    } catch (e) {
        console.error("Failed to update product", e);
    }
  };

  const recordSale = async (sale: Sale) => {
    try {
        // 1. Insert Sale
        const { error: saleError } = await supabase.from('sales').insert([sale]);
        if (saleError) throw saleError;

        setSales(prev => [sale, ...prev]);

        // 2. Update Inventory Stocks
        for (const item of sale.items) {
          const product = inventory.find(p => p.id === item.productId);
          if (product) {
            const newStock = product.stock - item.quantity;
            await updateProduct(product.id, { stock: newStock });
          }
        }
    } catch (e) {
        console.error("Failed to record sale", e);
    }
  };

  const addExpense = async (expense: Expense) => {
    try {
        const { error } = await supabase.from('expenses').insert([{
            id: expense.id,
            date: expense.date,
            description: expense.description,
            amount: expense.amount,
            category: expense.category,
            receipt_url: expense.receiptImage // Mapping receiptImage property to receipt_url column
        }]);
        if (error) throw error;
        setExpenses(prev => [expense, ...prev]);
    } catch (e) {
        console.error("Failed to add expense", e);
    }
  };

  const getFormattedInventory = () => {
    return inventory.map(i => `${i.name}: ${i.stock} ${i.unit} available`).join('\n');
  };

  return (
    <StoreContext.Provider value={{ inventory, sales, expenses, addProduct, updateProduct, recordSale, addExpense, getFormattedInventory, isLoading }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
};