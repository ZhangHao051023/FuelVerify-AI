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

## 🚀 Deployment & Setup

### Local Setup
1. Enter your **Gemini API Key** in the platform settings.
2. Select your **Zone** (West or East Malaysia) in the app settings.

### Google Cloud Run Deployment
To deploy this application to Google Cloud Run:

1.  **Configure GEMINI_API_KEY (Critical):**
    The application requires a Gemini API Key to fetch live fuel prices and perform AI usage verification on the server.
    - **Recommended:** Store your key in **GCP Secret Manager** as `GEMINI_API_KEY`.
    - Grant the **Secret Manager Secret Accessor** role (`roles/secretmanager.secretAccessor`) to your Cloud Run Service Account (e.g., `...-compute@developer.gserviceaccount.com`).
    - Map the secret to an environment variable named `GEMINI_API_KEY` in your Cloud Run service settings.

2.  **Verification:**
    Once deployed, check the application logs. You should see `GEMINI_API_KEY present: true`. If `false`, AI features will be disabled.

## 💻 Tech Stack

*   **Frontend:** React 19, TypeScript, Tailwind CSS
*   **Backend:** Node.js + Express (API Proxy & Server-side AI)
*   **Animations:** Framer Motion
*   **AI Integration:** Google Generative AI (Gemini 2.0 / 1.5)
*   **Cloud:** Docker + Google Cloud Run

## ⚠️ Disclaimer

This application is a **prototype** designed for individual tracking and educational purposes. While it fetches data from official government sources, it is not an official government application. Always cross-reference critical data with official announcements from the Ministry of Finance (MOF).

---
*Created for smart fuel management in Malaysia.*
