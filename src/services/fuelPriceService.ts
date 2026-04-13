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
  // 1. Try direct fetch from data.gov.my API first
  try {
    console.log("Attempting direct fetch from data.gov.my API...");
    const response = await fetch('https://api.data.gov.my/data-catalogue?id=fuelprice');
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const latest = data[data.length - 1];
        console.log("Direct fetch successful. Latest data date:", latest.date);
        
        // Mapping logic based on data.gov.my structure
        // ron95: Standard price (subsidized for now, might be market later)
        // ron95_budi95: Targeted subsidy price
        // ron97: Market price
        // diesel: West Malaysia price
        // diesel_eastmsia: East Malaysia price
        
        const ron95_subsidized = latest.ron95_budi95 || latest.ron95 || 2.05;
        // Market price for RON95 is often not in the simple JSON, 
        // we might still need AI for the "Market Price" or use a heuristic.
        // For now, we'll use the AI as a fallback or to "fill in" the market price if missing.
        
        const prices: RegionalFuelPrices = {
          'West Malaysia': {
            RON95: ron95_subsidized,
            RON95_Market: latest.ron95 > ron95_subsidized ? latest.ron95 : latest.ron95 + 1.20, // Heuristic if market price not clear
            RON97: latest.ron97,
            Diesel: latest.diesel,
            RON95_SubsidyLimit: 200,
          },
          'East Malaysia': {
            RON95: ron95_subsidized,
            RON95_Market: latest.ron95 > ron95_subsidized ? latest.ron95 : latest.ron95 + 1.20,
            RON97: latest.ron97,
            Diesel: latest.diesel_eastmsia || 2.15,
            RON95_SubsidyLimit: 200,
          }
        };
        
        // If we have the data but need a more accurate "Market Price", 
        // we could still call AI but it's better to respect the "direct fetch" request.
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
