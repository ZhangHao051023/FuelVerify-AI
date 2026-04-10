/**
 * Utility to safely retrieve the Gemini API Key from different environments.
 * - process.env.GEMINI_API_KEY: Used in AI Studio preview.
 * - import.meta.env.VITE_GEMINI_API_KEY: Used in production builds (e.g., Cloudflare Pages).
 */
export const getGeminiApiKey = (): string => {
  // 1. Check Vite standard environment variable (highest priority for production)
  try {
    const viteKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
    if (viteKey && viteKey !== "MY_GEMINI_API_KEY" && viteKey.length > 10) {
      return viteKey;
    }
  } catch (e) {}

  // 2. Check process.env (AI Studio preview)
  try {
    // @ts-ignore
    const processKey = typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : null;
    if (processKey && processKey !== "MY_GEMINI_API_KEY" && processKey.length > 10) {
      return processKey;
    }
  } catch (e) {}

  return "";
};
