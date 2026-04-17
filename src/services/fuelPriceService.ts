import { GoogleGenAI, Type } from "@google/genai";
import { Zone } from "../types";
import { getGeminiApiKey } from "../lib/config";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: getGeminiApiKey() });
  }
  return aiInstance;
}

export interface FuelPrices {
  RON95: number;
  RON95_Market: number;
  RON97: number;
  Diesel: number;
  RON95_SubsidyLimit: number;
}

export type RegionalFuelPrices = Record<Zone, FuelPrices>;

const FUEL_PRICE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    'West Malaysia': {
      type: Type.OBJECT,
      properties: {
        RON95: { type: Type.NUMBER, description: "Subsidized price of RON95 in RM for West Malaysia" },
        RON95_Market: { type: Type.NUMBER, description: "Non-subsidized (market) price of RON95 in RM for West Malaysia" },
        RON97: { type: Type.NUMBER, description: "Price of RON97 in RM for West Malaysia" },
        Diesel: { type: Type.NUMBER, description: "Price of Diesel in RM for West Malaysia" },
        RON95_SubsidyLimit: { type: Type.NUMBER, description: "Monthly subsidy limit for RON95 in Liters for West Malaysia" },
      },
      required: ["RON95", "RON95_Market", "RON97", "Diesel", "RON95_SubsidyLimit"],
    },
    'East Malaysia': {
      type: Type.OBJECT,
      properties: {
        RON95: { type: Type.NUMBER, description: "Subsidized price of RON95 in RM for East Malaysia" },
        RON95_Market: { type: Type.NUMBER, description: "Non-subsidized (market) price of RON95 in RM for East Malaysia" },
        RON97: { type: Type.NUMBER, description: "Price of RON97 in RM for East Malaysia" },
        Diesel: { type: Type.NUMBER, description: "Price of Diesel in RM for East Malaysia" },
        RON95_SubsidyLimit: { type: Type.NUMBER, description: "Monthly subsidy limit for RON95 in Liters for East Malaysia" },
      },
      required: ["RON95", "RON95_Market", "RON97", "Diesel", "RON95_SubsidyLimit"],
    },
  },
  required: ["West Malaysia", "East Malaysia"],
};

export async function fetchLatestFuelPrices(): Promise<RegionalFuelPrices | null> {
  // 1. Try local server proxy (to avoid CORS) then direct fetch from data.gov.my API
  try {
    console.log("Attempting fetch from local proxy or data.gov.my...");
    // Try the local proxy first if we are in production or if it's available
    const proxyUrl = '/api/fuel-prices';
    const directUrl = 'https://api.data.gov.my/data-catalogue?id=fuelprice';
    
    let response = await fetch(proxyUrl).catch(() => null);
    if (!response || !response.ok) {
      console.log("Proxy failed or unavailable, trying direct fetch...");
      response = await fetch(directUrl);
    }

    if (response && response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        // Filter for 'level' series type to get actual prices, not weekly changes
        const levelData = data.filter((item: any) => item.series_type === 'level');
        if (levelData.length === 0) {
          throw new Error("No 'level' series data found in API response");
        }
        
        const latest = levelData[levelData.length - 1];
        console.log("Direct fetch successful. Latest data date:", latest.date, "Series type:", latest.series_type);
        
        // Mapping logic based on data.gov.my structure
        // ron95: Standard price (subsidized for now, might be market later)
        // ron95_budi95: Targeted subsidy price
        // ron97: Market price
        // diesel: West Malaysia price
        // diesel_eastmsia: East Malaysia price
        
        const ron95_subsidized = latest.ron95_budi95 || 2.05; // Default subsidized price if budi95 missing
        const ron95_market = latest.ron95 || ron95_subsidized + 1.20; // Use ron95 as market price if it's higher
        
        const prices: RegionalFuelPrices = {
          'West Malaysia': {
            RON95: ron95_subsidized,
            RON95_Market: Math.max(ron95_market, ron95_subsidized + 0.50), // Ensure market is higher
            RON97: latest.ron97,
            Diesel: latest.diesel,
            RON95_SubsidyLimit: 200,
          },
          'East Malaysia': {
            RON95: ron95_subsidized,
            RON95_Market: Math.max(ron95_market, ron95_subsidized + 0.50),
            RON97: latest.ron97,
            Diesel: latest.diesel_eastmsia || 2.15,
            RON95_SubsidyLimit: 200,
          }
        };
        
        return prices;
      }
    }
  } catch (error) {
    console.warn("Direct fetch from data.gov.my failed (likely CORS), falling back to AI...", error);
  }

  // 2. Fallback to Gemini AI with search tool, specifically targeting the requested URL
  const ai = getAI();
  const prompt = `Visit https://data.gov.my/data-catalogue/fuelprice and extract the latest fuel prices for Malaysia. 
  I need:
  - RON95 Subsidized Price (RM)
  - RON95 Market Price (Non-subsidized) (RM)
  - RON97 Price (RM)
  - Diesel Price for West Malaysia (RM)
  - Diesel Price for East Malaysia (RM)
  - RON95 Subsidy Limit (Liters) - should be 200L.
  
  Provide the data for both West Malaysia and East Malaysia.`;

  try {
    console.log("Attempting to fetch fuel prices with Gemini AI (Search Tool)...");
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: FUEL_PRICE_SCHEMA,
      },
    });

    if (response.text) {
      console.log("Fuel prices fetched successfully with Gemini AI.");
      return JSON.parse(response.text.trim()) as RegionalFuelPrices;
    }
  } catch (error) {
    console.error("All fuel price fetch methods failed:", error);
    throw error;
  }
  return null;
}
