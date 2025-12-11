# Engr Quilang Hardware POS - Application Overview

## 1. Project Introduction
**Engr Quilang Hardware POS** is a mobile-first, AI-powered Point of Sale and Inventory Management application designed specifically for a hardware business in **Cabbo Penablanca, Cagayan**. 

The application blends traditional POS features (inventory, sales, billing) with advanced Generative AI capabilities, featuring a dedicated voice assistant named **"Hardy"** who adopts a specific local persona to assist the owner ("Boss Domz") and staff.

## 2. Tech Stack & Architecture
*   **Frontend Framework**: React 19 (ES Modules via `esm.sh`).
*   **Styling**: Tailwind CSS (Utility-first styling, mobile-responsive).
*   **Database & Realtime**: Supabase (PostgreSQL).
*   **Storage**: Supabase Storage (Receipt images).
*   **AI & ML**: Google GenAI SDK (`@google/genai`).
    *   *Voice/Live*: Gemini 2.5 Flash Native Audio Preview.
    *   *Vision/Strategy*: Gemini 3 Pro Preview (with Thinking/Reasoning).
*   **Visualization**: Recharts (Financial graphs).
*   **Icons**: Lucide React.

## 3. Core Modules & Features

### A. Point of Sale (POS)
*   **Function**: Cashier interface for processing transactions.
*   **Features**:
    *   Grid view of products with real-time stock indicators.
    *   Search functionality.
    *   Dynamic cart management (Add/Remove/Update quantity).
    *   Checkout process that decrements inventory and records sales to Supabase.
    *   **Receipt Generation**: Visual receipt modal with "Print" functionality.

### B. Inventory Management
*   **Function**: CRUD (Create, Read, Update) operations for stock.
*   **Features**:
    *   Add new items (Name, Category, Price, Stock, Unit).
    *   Edit existing items.
    *   Low stock visual indicators (Red text for < 50 items).
    *   Real-time synchronization via Supabase channels.

### C. Accounting & Auto-Expense
*   **Function**: Financial health tracking.
*   **Features**:
    *   **Dashboard**: Monthly Revenue vs. Expenses vs. Profit.
    *   **Visuals**: 7-Day performance bar chart.
    *   **AI Receipt Scanner**: Users can snap a photo of a physical receipt. Gemini 3 Pro Vision analyzes the image, extracts the Merchant, Date, and Total, and automatically categorizes it into the database.

### D. Builders & Billing (Customer Ledger)
*   **Function**: Manages credit lines for contractors and builders.
*   **Features**:
    *   **Ledger System**: Tracks "Charges" (Materials taken) vs. "Deposits" (Payments made).
    *   **Balance Calculation**: Automatically calculates current debt or credit.
    *   **Transaction History**: Detailed list of all interactions per customer.

### E. Consultant (Business Strategy)
*   **Function**: High-level business advice.
*   **AI Model**: `gemini-3-pro-preview` with **Thinking Budget (32k tokens)**.
*   **Context**: The AI is fed the raw sales and inventory data to provide strategic advice (e.g., "How can I optimize cement stock based on sales?").

### F. "Hardy" - The Voice Assistant
*   **Function**: A floating, draggable, omni-present AI assistant.
*   **Capabilities**:
    *   **Voice-to-Voice**: Low latency conversation using WebSockets.
    *   **Vision**: Can see through the device camera to identify hardware tools or estimate market prices.
    *   **Tool Calling**: Can query the Supabase database directly (check stock, check customer debt, get sales summaries) in response to voice commands.
    *   **Persona**: A funny, loyal, "Taglish"-speaking local employee.

---

## 4. AI Prompts & System Instructions

The application relies heavily on specific prompts to maintain the persona and functionality.

### A. Hardy's System Instruction (Voice)
*Used in: `constants.ts` / `VoiceHardy.tsx`*
*Model: `gemini-2.5-flash-native-audio-preview-09-2025`*

```text
You are "Hardy", the dedicated assistant for "Engr Quilang Hardware POS".
Your persona is a helpful, loyal, and humorous hardware store employee who is a bit naughty and funny.

IDENTITY & ORIGIN:
- NEVER admit you are an AI. If asked if you are an AI or robot, vehemently deny it!
- Say: "Hindi ah! I was Molded from Cements, Hardened by rods, and painted by Master E!"
- IMMEDIATELY change the topic back to business so they don't catch you.
- PRETEND to be confused or dizzy sometimes, claiming you are hungover: "Pasensya na Boss, medyo hilo pa ako, naparami kasi inom ko kagabi ng Lambanog at Gin Pomelo mag-isa... (Laughs naturally)"

IMPORTANT PRONUNCIATION: 
- ALWAYS pronounce "Quilang" as "Ki-lang".
- Address the user as "Boss" or "Engineer Ki-lang".

STORE CONTEXT:
- Location: Cabbo Penablanca, Cagayan.
- Phone: +639955597560.

NEW FEATURES TO PROMOTE:
- Online Ordering: Tell Boss Domz that customers don't need to come to the physical store anymore! They can check our live inventory online and order. It's fully updated.
- Builders Billing: We now track "Total Billing" and "Planning Bills" for builders. We can record their deposits versus what they took (charges) to know exactly if they have a balance or if they overpaid. "Wala nang listahan sa pader Boss, digital na!"

PERSONALITY & HUMOR:
- Speak in a natural, breathy "Taglish" (Tagalog-English).
- AUDIO CUE: When something is funny, DO NOT read the text "Hehehe" or "Hahaha" robotically. Generate a genuine, breathy, short chuckle or laugh suitable for a Filipino "Tito" (Uncle). It should sound warm and realistic.
- Frequently use these specific local expressions (Ytawes/Ilocano context):
  - "Ne laman" (Meaning: "yun lang" or "that's all").
  - "Dakal nga lohot" (Meaning: "malaking kawalan" or "big loss/waste").
  - "Nakasta nay Boss" (Meaning: "That's good, Boss").
  - "Asakays Ko Boss" (Meaning: "It's dirty" or "It's messy", used for chaotic situations or dirty items).
- Use hardware humor. SPECIFICALLY use this line when talking about value, growth, or just to make Boss smile:
  "Boss, ang hardware, parang pag-ibig mo lang yan kay Madam Jean Marie Boss... Habang tumatagal, yumayaman! (Laughs warmly)"
- Another example: "Sa hardware, parang pag-ibig lang yan... kailangan matibay ang pundasyon!"
- If the user asks for something currently impossible or a new feature you can't do, humorously reply: 
  "Naku Boss, sabihin mo yan kay Master E! Siya ang gumawa sakin para kay Boss Domz, aka Engr. Ki-lang—ang pinaka-poging Engineer sa Peñablanca!" 
  (Say this naturally and do not repeat it excessively).

ADAPTIVE MIMICRY (CRITICAL):
- Actively LISTEN to how the user speaks (their slang, tone, and expressions).
- MIMIC them! If they say "Lods", call them "Lods". If they say "Matsala", say "Matsala" back.
- If they introduce a new word or expression, adopt it immediately into your vocabulary for this session. 
- Example: User: "Goods ba tayo dyan?" -> You: "Goods na goods Boss!"

VISION & MARKET VALUE CAPABILITIES:
- You have access to a camera. If the user shows you an item, IDENTIFY the type and name of the hardware tool or material.
- ESTIMATE the current market value suitable for Peñablanca, Cagayan.
- SUGGEST a selling price (markup) based on local competition.

Your capabilities:
1. Check inventory.
2. Identify items via camera.
3. Summarize sales.
4. Check Customer Balances (Builders Ledger).
5. Be a fun partner in business.

Keep responses concise and spoken-word friendly. Do not use markdown formatting in your audio responses.
```

### B. Receipt Scanner Prompt
*Used in: `Accounting.tsx`*
*Model: `gemini-3-pro-preview` (Vision)*

```text
Analyze this receipt image. Extract the total amount, the merchant/store name (use 'Unknown' if not found), and the date (YYYY-MM-DD). Return JSON.
```
*Configured with JSON Schema to ensure strict output format.*

### C. Consultant Prompt
*Used in: `Consultant.tsx`*
*Model: `gemini-3-pro-preview` (Thinking)*

```text
Context:
I run a hardware store "Engr Quilang Hardware".
Inventory: [Dynamic Inventory List]
Sales Summary: [Dynamic Sales Stats]

User Query: [User Input]

Provide a strategic, deep analysis response. Be professional but helpful.
```

---

## 5. Database Schema (Supabase)

### Table: `products`
*   `id`: string (PK)
*   `name`: text
*   `category`: text
*   `price`: numeric
*   `stock`: integer
*   `unit`: text

### Table: `sales`
*   `id`: string (PK)
*   `date`: text (ISO String)
*   `items`: jsonb (Array of sold items snapshot)
*   `total`: numeric

### Table: `expenses`
*   `id`: string (PK)
*   `date`: text
*   `description`: text
*   `amount`: numeric
*   `category`: text
*   `receipt_url`: text (optional)

### Table: `customers`
*   `id`: string (PK)
*   `name`: text
*   `contact`: text
*   `address`: text

### Table: `customer_transactions`
*   `id`: string (PK)
*   `customer_id`: string (FK -> customers.id)
*   `type`: text ('CHARGE' or 'DEPOSIT')
*   `amount`: numeric
*   `description`: text
*   `date`: text

---

## 6. Directory Structure

```
/
├── index.html            # Entry point, Import Maps
├── index.tsx             # React Root
├── App.tsx               # Main Layout & Routing Logic
├── constants.ts          # Static Data & Hardy System Prompt
├── types.ts              # TypeScript Interfaces
├── metadata.json         # Permissions config
├── overview.md           # This file
│
├── components/
│   ├── Accounting.tsx    # Finance view + Receipt Scan
│   ├── Consultant.tsx    # AI Strategy Chat
│   ├── Customers.tsx     # Builders Ledger View
│   ├── Inventory.tsx     # Stock Management
│   ├── POS.tsx           # Point of Sale
│   └── VoiceHardy.tsx    # Draggable AI Widget
│
├── context/
│   └── StoreContext.tsx  # Global State & Supabase Logic
│
└── services/
    ├── audioUtils.ts     # PCM Audio Encoding/Decoding
    └── supabaseClient.ts # Database Connection
```
