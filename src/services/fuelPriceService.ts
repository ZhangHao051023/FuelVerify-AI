import { GoogleGenAI, Type } from "@google/genai";
import { Zone, FuelPrices, RegionalFuelPrices } from "../types";
import { getGeminiApiKey } from "../lib/config";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: getGeminiApiKey() });
  }
  return aiInstance;
}

const FUEL_PRICE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    'West Malaysia': {
      type: Type.OBJECT,
      properties: {
        RON95: { type: Type.NUMBER, description: "Subsidized price of RON95 in RM for West Malaysia (e.g. 2.05)" },
        RON95_Market: { type: Type.NUMBER, description: "Non-subsidized (market) price of RON95 in RM for West Malaysia" },
        RON97: { type: Type.NUMBER, description: "Price of RON97 in RM for West Malaysia" },
        Diesel: { type: Type.NUMBER, description: "Price of Diesel in RM for West Malaysia" },
        RON95_SubsidyLimit: { type: Type.NUMBER, description: "Monthly subsidy limit for RON95 in Liters for West Malaysia (usually 200)" },
        source: { type: Type.STRING, description: "The source of this data (e.g. 'data.gov.my', 'Paul Tan')" },
        date: { type: Type.STRING, description: "The effective date of these prices" },
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
        source: { type: Type.STRING, description: "The source of this data" },
        date: { type: Type.STRING, description: "The effective date of these prices" },
      },
      required: ["RON95", "RON95_Market", "RON97", "Diesel", "RON95_SubsidyLimit"],
    },
  },
  required: ["West Malaysia", "East Malaysia"],
};

export async function fetchLatestFuelPrices(): Promise<RegionalFuelPrices | null> {
  const ai = getAI();
  const currentDate = new Date().toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' });
  
  // Updated schema to include analysis
  const ANALYSIS_SCHEMA = {
    type: Type.OBJECT,
    properties: {
      'West Malaysia': {
        type: Type.OBJECT,
        properties: {
          ...FUEL_PRICE_SCHEMA.properties['West Malaysia'].properties,
          analysis: { type: Type.STRING, description: "Detailed analysis of how these prices were determined from search results" }
        },
        required: [...FUEL_PRICE_SCHEMA.properties['West Malaysia'].required, "analysis"]
      },
      'East Malaysia': {
        type: Type.OBJECT,
        properties: {
          ...FUEL_PRICE_SCHEMA.properties['East Malaysia'].properties,
          analysis: { type: Type.STRING, description: "Detailed analysis of how these prices were determined from search results" }
        },
        required: [...FUEL_PRICE_SCHEMA.properties['East Malaysia'].required, "analysis"]
      }
    },
    required: ["West Malaysia", "East Malaysia"]
  };

  const prompt = `You are an AI Analysis Worker specialized in Malaysian economic data.
  TODAY'S DATE IS: ${currentDate}.
  
  YOUR TASK: Perform a deep web search to find the ABSOLUTE LATEST fuel prices in Malaysia effective as of ${currentDate}.
  
  SOURCES TO ANALYZE:
  1. data.gov.my (https://data.gov.my/data-catalogue/fuelprice) - Look for the most recent entry.
  2. Paul Tan's Automotive News (paultan.org) - Search for "Weekly fuel price update".
  3. Ministry of Finance (MOF) Malaysia official portal.
  4. Reliable news outlets (The Star, Bernama, Malay Mail).
  
  DATA POINTS NEEDED (West & East Malaysia):
  - RON95 Subsidized Price (Fixed at RM 2.05 currently, but verify if any changes).
  - RON95 Market Price (Floating price, usually around RM 3.00+).
  - RON97 Price (Floating).
  - Diesel Price (Note: West Malaysia diesel is now floating, East Malaysia is subsidized at RM 2.15).
  - RON95 Subsidy Limit (Usually 200L/month).
  
  ANALYSIS REQUIREMENT:
  In the 'analysis' field, explain exactly which source you used, the date of the announcement, and why these prices are the most current.
  
  Return the data in the specified JSON format.`;

  try {
    console.log(`[AI Analysis Worker] Starting web search for fuel prices as of ${currentDate}...`);
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp", // Using a strong model for search and analysis
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: ANALYSIS_SCHEMA,
      },
    });

    if (response.text) {
      const data = JSON.parse(response.text.trim()) as RegionalFuelPrices;
      console.log("Fuel prices retrieved from web search:", data);
      return data;
    }
  } catch (error) {
    console.error("Web search for fuel prices failed:", error);
    // Fallback to a simpler prompt without search tool if search fails
    try {
      console.log("Falling back to internal knowledge for fuel prices...");
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-exp",
        contents: `Provide the most recent known fuel prices for Malaysia as of ${currentDate}. 
        Include RON95 (Subsidized RM 2.05), RON95 Market, RON97, and Diesel. 
        Explain that this is based on internal knowledge in the analysis field.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: ANALYSIS_SCHEMA,
        },
      });
      if (response.text) {
        return JSON.parse(response.text.trim()) as RegionalFuelPrices;
      }
    } catch (innerError) {
      console.error("All fuel price retrieval methods failed:", innerError);
      throw innerError;
    }
  }
  return null;
}
