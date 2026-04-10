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
  const ai = getAI();
  const prompt = "Search for the latest fuel prices in Malaysia for RON95 (both subsidized and market price), RON97, and Diesel in both West Malaysia and East Malaysia. Also search for the current monthly RON95 subsidy limit (in Liters) as announced by the Malaysian government (it should be around 200 Liters). Provide the prices in RM (Ringgit Malaysia).";

  try {
    console.log("Attempting to fetch fuel prices with search tool...");
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
      console.log("Fuel prices fetched successfully with search tool.");
      return JSON.parse(response.text.trim()) as RegionalFuelPrices;
    }
  } catch (error) {
    console.warn("Fuel price fetch with search tool failed, trying without search tool...", error);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt + " If you cannot search, please provide the most recent known prices as of your training data. Use 200 Liters as the subsidy limit if unsure.",
        config: {
          responseMimeType: "application/json",
          responseSchema: FUEL_PRICE_SCHEMA,
        },
      });
      if (response.text) {
        console.log("Fuel prices fetched successfully without search tool (fallback).");
        return JSON.parse(response.text.trim()) as RegionalFuelPrices;
      }
    } catch (innerError) {
      console.error("Fuel price fetch failed completely:", innerError);
      throw innerError;
    }
  }
  return null;
}
