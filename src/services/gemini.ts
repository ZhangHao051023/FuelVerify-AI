import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { PetrolRecord, VerificationResult } from "../types";
import { getGeminiApiKey } from "../lib/config";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: getGeminiApiKey() });
  }
  return aiInstance;
}

export const extractReceiptData = async (base64Image: string): Promise<Partial<PetrolRecord>> => {
  try {
    const ai = getAI();
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

    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to extract receipt data", e);
    return {};
  }
};

export const verifyUsage = async (record: PetrolRecord, history: PetrolRecord[]): Promise<VerificationResult> => {
  try {
    const response = await fetch('/api/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ record, history }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    return await response.json();
  } catch (e) {
    console.error("Verification failed (server fallback)", e);
    // Local fallback if server fails and we have a local key
    try {
      const apiKey = getGeminiApiKey();
      if (!apiKey) throw new Error("No local API key");
      
      const ai = getAI();
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            text: `As a Malaysian government petrol usage auditor, verify this record against the user's history and general policy rules.
            
            Current Record:
            ${JSON.stringify(record, null, 2)}
            
            History (Last 5 records):
            ${JSON.stringify(history.slice(0, 5), null, 2)}
            
            Return a JSON object:
            {
              "status": "verified" | "flagged",
              "notes": ["List of observations"]
            }`,
          },
        ],
        config: {
          responseMimeType: "application/json",
        },
      });

      return JSON.parse(response.text || '{"status": "flagged", "notes": ["Error in verification"]}');
    } catch (innerError) {
      return { status: "flagged", notes: ["Verification failed to process"] };
    }
  }
};
