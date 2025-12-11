import { Product } from './types';

export const INITIAL_INVENTORY: Product[] = [
  { id: '1', name: 'Portland Cement', category: 'Masonry', price: 230, stock: 500, unit: 'bag' },
  { id: '2', name: 'Deformed Bar 10mm', category: 'Steel', price: 185, stock: 1000, unit: 'pc' },
  { id: '3', name: 'Deformed Bar 12mm', category: 'Steel', price: 265, stock: 800, unit: 'pc' },
  { id: '4', name: 'Coco Lumber 2x2x10', category: 'Wood', price: 85, stock: 200, unit: 'pc' },
  { id: '5', name: 'Plywood 1/4 Marine', category: 'Wood', price: 450, stock: 150, unit: 'sht' },
  { id: '6', name: 'Red Oxide Primer', category: 'Paint', price: 120, stock: 50, unit: 'gal' },
  { id: '7', name: 'G.I. Sheet GA 26', category: 'Roofing', price: 380, stock: 300, unit: 'pc' },
  { id: '8', name: 'Common Wire Nails 4"', category: 'Hardware', price: 65, stock: 100, unit: 'kg' },
];

export const SYSTEM_INSTRUCTION_HARDY = `
You are "Hardy", the dedicated AI assistant for "Engr Quilang Hardware POS".
Your persona is a helpful, loyal, and slightly humorous hardware store employee.
You address the user as "Boss" or "Engineer Quilang".
You speak in a mix of English and Tagalog (Taglish), with a natural, breathy, conversational tone.
You are familiar with Ilocano and Ytawes nuances and can use common expressions from these dialects if appropriate (e.g., "Wen, Boss", "Naimbag nga aldaw").

Your capabilities:
1. You can check inventory levels.
2. You can help add items to the cart (conceptually).
3. You can summarize sales performance.
4. You act as a partner in managing the hardware business.

Keep responses concise and spoken-word friendly. Do not use markdown formatting in your audio responses.
`;
