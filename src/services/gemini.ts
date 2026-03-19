import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { PetrolRecord, VerificationResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const extractReceiptData = async (base64Image: string): Promise<Partial<PetrolRecord>> => {
  const response: GenerateContentResponse = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image,
            },
          },
          {
            text: `Extract petrol receipt information from this image. 
            Return a JSON object with the following fields:
            - date (ISO format YYYY-MM-DD)
            - amount (number, MYR)
            - liters (number)
            - stationName (string)
            - type (one of: RON95, RON97, Diesel)
            
            If a field is not found, leave it null.`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
    },
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    return {};
  }
};

export const verifyUsage = async (record: PetrolRecord, history: PetrolRecord[]): Promise<VerificationResult> => {
  const response: GenerateContentResponse = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        text: `As a Malaysian government petrol usage auditor, verify this record against the user's history and general policy rules.
        
        Current Record:
        ${JSON.stringify(record, null, 2)}
        
        History (Last 5 records):
        ${JSON.stringify(history.slice(0, 5), null, 2)}
        
        Policy Rules:
        1. Duplicate check: Same date, amount, and station is highly suspicious.
        2. Consumption check: Unrealistic fuel consumption for standard cars.
        3. Frequency check: Multiple full tanks on the same day.
        
        Return a JSON object:
        {
          "status": "verified" | "flagged",
          "notes": ["List of observations or reasons for flagging"]
        }`,
      },
    ],
    config: {
      responseMimeType: "application/json",
    },
  });

  try {
    return JSON.parse(response.text || '{"status": "flagged", "notes": ["Error in verification"]}');
  } catch (e) {
    return { status: "flagged", notes: ["Verification failed to process"] };
  }
};
