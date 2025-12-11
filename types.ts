export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  unit: string;
}

export interface SaleItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  date: string; // ISO string
  items: SaleItem[];
  total: number;
}

export interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  receiptImage?: string; // base64
}

export interface Customer {
  id: string;
  name: string;
  contact: string;
  address: string;
}

export interface CustomerTransaction {
  id: string;
  customerId: string;
  type: 'CHARGE' | 'DEPOSIT';
  amount: number;
  description: string;
  date: string;
}

export enum ViewState {
  POS = 'POS',
  INVENTORY = 'INVENTORY',
  ACCOUNTING = 'ACCOUNTING',
  CONSULTANT = 'CONSULTANT',
  CUSTOMERS = 'CUSTOMERS'
}

export interface AiThinkingConfig {
  thinkingBudget?: number;
}