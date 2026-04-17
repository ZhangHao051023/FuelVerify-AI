# FuelVerify AI ⛽🤖

**FuelVerify AI** is a specialized fuel management dashboard designed for the Malaysian market. It provides a "pre-verification" layer for vehicle owners to track their petrol usage, monitor targeted subsidy limits, and verify receipts using artificial intelligence.

## 🌟 Key Features

*   **Real-time Fuel Prices:** Automatically fetches the latest retail prices for RON95, RON97, and Diesel directly from the official [data.gov.my](https://data.gov.my/data-catalogue/fuelprice) API.
*   **Targeted Subsidy Tracker:** Monitors your monthly **200 Liter RON95 subsidy limit**. The app calculates exactly how much subsidized fuel you have left before market rates apply.
*   **AI Receipt Verification:** Uses **Google Gemini 1.5 Flash** to analyze uploaded petrol receipts. It automatically extracts the station name, amount, liters, and fuel type while flagging any details that look suspicious or incorrect.
*   **Regional Pricing:** Toggle between **West Malaysia** and **East Malaysia** to ensure price calculations match your local rates (especially for Diesel).
*   **Detailed Analytics:** Visualize your consumption trends with interactive charts showing spending and volume over time.
*   **Exportable Reports:** Generate verification summaries and data exports for personal records or administrative submissions.

## 🛠️ How it Works

### 1. Data Intelligence
The app uses a two-tier system for fuel prices:
*   **Primary:** Direct fetch from the Ministry of Economy's `data.gov.my` catalogue.
*   **Fallback:** If the API is unreachable, the AI performs a web search to find and verify the latest official announcement.

### 2. AI Verification Layer
When you upload a record, Gemini AI performs a "sanity check" by comparing the receipt date, fuel type, and volume against the historical prices for that specific period. If there is a mismatch (e.g., you recorded RON95 at RON97 prices), the app will **Flag** the record for review.

## 🚀 Getting Started

### Prerequisites
*   **Gemini API Key:** An API key is required for receipt extraction and AI verification features. You can get one for free at [Google AI Studio](https://aistudio.google.com/).

### Setup
1.  Enter your **Gemini API Key** in the platform settings.
2.  Open the **Settings** tab in the app.
3.  Select your **Zone** (West or East Malaysia).
4.  Click **Refresh Prices Now** to pull the latest government data.

## 💻 Tech Stack

*   **Frontend:** React 18, TypeScript, Tailwind CSS
*   **Animations:** Framer Motion
*   **Charts:** Recharts
*   **AI Integration:** Google Generative AI (Gemini 1.5 Flash)
*   **Icons:** Lucide React

## ⚠️ Disclaimer

This application is a **prototype** designed for individual tracking and educational purposes. While it fetches data from official government sources, it is not an official government application. Always cross-reference critical data with official announcements from the Ministry of Finance (MOF).

---
*Created for smart fuel management in Malaysia.*
