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

export enum ViewState {
  POS = 'POS',
  INVENTORY = 'INVENTORY',
  ACCOUNTING = 'ACCOUNTING',
  CONSULTANT = 'CONSULTANT'
}

export interface AiThinkingConfig {
  thinkingBudget?: number;
}