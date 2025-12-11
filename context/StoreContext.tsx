import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, Sale, Expense, Customer, CustomerTransaction } from '../types';
import { INITIAL_INVENTORY } from '../constants';
import { supabase } from '../services/supabaseClient';

interface StoreContextType {
  inventory: Product[];
  sales: Sale[];
  expenses: Expense[];
  customers: Customer[];
  customerTransactions: CustomerTransaction[];
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  recordSale: (sale: Sale) => Promise<void>;
  addExpense: (expense: Expense) => Promise<void>;
  addCustomer: (customer: Customer) => Promise<void>;
  addCustomerTransaction: (transaction: CustomerTransaction) => Promise<void>;
  getFormattedInventory: () => string;
  isLoading: boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [inventory, setInventory] = useState<Product[]>(INITIAL_INVENTORY);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerTransactions, setCustomerTransactions] = useState<CustomerTransaction[]>([]);
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
        }

        // Fetch Sales
        const { data: salesData } = await supabase.from('sales').select('*').order('date', { ascending: false });
        if (salesData) setSales(salesData);

        // Fetch Expenses
        const { data: expData } = await supabase.from('expenses').select('*').order('date', { ascending: false });
        if (expData) setExpenses(expData);

        // Fetch Customers
        const { data: custData } = await supabase.from('customers').select('*');
        if (custData) setCustomers(custData);

        // Fetch Transactions
        const { data: transData } = await supabase.from('customer_transactions').select('*').order('date', { ascending: false });
        if (transData) setCustomerTransactions(transData);

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Setup Realtime Subscription
    const channel = supabase.channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
         if(payload.eventType === 'INSERT') setInventory(prev => [...prev, payload.new as Product]);
         if(payload.eventType === 'UPDATE') setInventory(prev => prev.map(p => p.id === payload.new.id ? payload.new as Product : p));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, (payload) => {
         if(payload.eventType === 'INSERT') setSales(prev => [payload.new as Sale, ...prev]);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, (payload) => {
         if(payload.eventType === 'INSERT') setCustomers(prev => [...prev, payload.new as Customer]);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_transactions' }, (payload) => {
         if(payload.eventType === 'INSERT') setCustomerTransactions(prev => [payload.new as CustomerTransaction, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); }

  }, []);

  const addProduct = async (product: Product) => {
    try {
        const { error } = await supabase.from('products').insert([product]);
        if (error) throw error;
        // State update handled by realtime or manual fallback if needed
    } catch (e) {
        console.error("Failed to add product", e);
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    try {
        const { error } = await supabase.from('products').update(updates).eq('id', id);
        if (error) throw error;
    } catch (e) {
        console.error("Failed to update product", e);
    }
  };

  const recordSale = async (sale: Sale) => {
    try {
        // 1. Insert Sale
        const { error: saleError } = await supabase.from('sales').insert([sale]);
        if (saleError) throw saleError;

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
            receipt_url: expense.receiptImage 
        }]);
        if (error) throw error;
        setExpenses(prev => [expense, ...prev]); // Optimistic update for expenses since we aren't strict on realtime for this demo
    } catch (e) {
        console.error("Failed to add expense", e);
    }
  };

  const addCustomer = async (customer: Customer) => {
    try {
      const { error } = await supabase.from('customers').insert([customer]);
      if (error) throw error;
    } catch (e) {
      console.error("Failed to add customer", e);
    }
  };

  const addCustomerTransaction = async (transaction: CustomerTransaction) => {
    try {
      const { error } = await supabase.from('customer_transactions').insert([{
        id: transaction.id,
        customer_id: transaction.customerId, // Mapping for DB column
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        date: transaction.date
      }]);
      if (error) throw error;
    } catch (e) {
      console.error("Failed to add transaction", e);
    }
  };

  const getFormattedInventory = () => {
    return inventory.map(i => `${i.name}: ${i.stock} ${i.unit} available`).join('\n');
  };

  return (
    <StoreContext.Provider value={{ 
      inventory, sales, expenses, customers, customerTransactions,
      addProduct, updateProduct, recordSale, addExpense, addCustomer, addCustomerTransaction,
      getFormattedInventory, isLoading 
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
};