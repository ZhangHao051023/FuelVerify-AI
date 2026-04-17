import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { PetrolRecord, VerificationResult } from "../types";
import { getGeminiApiKey } from "../lib/config";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export const extractReceiptData = async (base64Image: string): Promise<Partial<PetrolRecord>> => {
  // 1. Try Local AI first if user provided a key (Priority to save dev cost)
  const localAi = getAI();
  if (localAi) {
    try {
      console.log("Attempting local AI extraction (User Key)...");
      const response: GenerateContentResponse = await localAi.models.generateContent({
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
      console.warn("Local extraction failed, falling back to server...", e);
    }
  }

  // 2. Fallback to Server Proxy (Uses Dev's Key)
  try {
    const response = await fetch('/api/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ base64Image }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    return await response.json();
  } catch (e: any) {
    console.error("Failed to extract receipt data via server", e);
    return {};
  }
};

export const verifyUsage = async (record: PetrolRecord, history: PetrolRecord[]): Promise<VerificationResult> => {
  // 1. Try Local AI first if user provided a key (Priority)
  const localAi = getAI();
  if (localAi) {
    try {
      console.log("Attempting local AI verification (User Key)...");
      const response: GenerateContentResponse = await localAi.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `As a Malaysian government petrol usage auditor, verify this record against the user's history and general policy rules.
            
            Current Record:
            ${JSON.stringify(record, null, 2)}
            
            History (Last 5 records):
            ${JSON.stringify(history.slice(0, 5), null, 2)}
            
            Return a JSON object:
            {
              "status": "verified" | "flagged",
              "notes": ["List of observations"]
            }`,
        config: {
          responseMimeType: "application/json",
        },
      });

      return JSON.parse(response.text || '{"status": "flagged", "notes": ["Error parsing local AI response"]}');
    } catch (e) {
      console.warn("Local verification failed, falling back to server...", e);
    }
  }

  // 2. Fallback to Server Proxy (Uses Dev's Key)
  try {
    const response = await fetch('/api/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ record, history }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    return await response.json();
  } catch (e: any) {
    let errorMessage = e.message;
    try {
      // Try to parse JSON error if it's a stringified object from the server
      const parsed = JSON.parse(e.message);
      if (parsed.error && parsed.error.message) {
        errorMessage = parsed.error.message;
      }
    } catch {
      // Not JSON, keep original
    }

    console.error("Verification failed completely:", errorMessage);
    return { 
      status: "flagged", 
      notes: [`AI Service Busy: ${errorMessage}. Please check AI Studio credits.`] 
    };
  }
};
