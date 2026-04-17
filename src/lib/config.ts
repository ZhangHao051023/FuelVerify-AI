/**
 * Utility to safely retrieve the Gemini API Key from different environments.
 * Priorities:
 * 1. User-provided key in localStorage (Offloads cost to user)
 * 2. Vite environment variable (Production)
 * 3. process.env (Development / Preview)
 */
export const getGeminiApiKey = (): string => {
  // 1. Check localStorage for user-provided key
  try {
    if (typeof window !== 'undefined') {
      const userKey = localStorage.getItem('user_gemini_api_key');
      if (userKey && userKey.length > 20) {
        return userKey;
      }
    }
  } catch (e) {}

  // 2. Check Vite standard environment variable
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
