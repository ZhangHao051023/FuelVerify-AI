/**
 * Utility to safely retrieve the Gemini API Key from different environments.
 * - process.env.GEMINI_API_KEY: Used in AI Studio preview.
 * - import.meta.env.VITE_GEMINI_API_KEY: Used in production builds (e.g., Cloudflare Pages).
 */
export const getGeminiApiKey = (): string => {
  try {
    // @ts-ignore - process might not be defined in all browser environments
    if (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) {
      // @ts-ignore
      return process.env.GEMINI_API_KEY;
    }
  } catch (e) {
    // Ignore errors from accessing process.env
  }

  // Vite standard environment variable
  if ((import.meta as any).env.VITE_GEMINI_API_KEY) {
    return (import.meta as any).env.VITE_GEMINI_API_KEY;
  }

  return "";
};
