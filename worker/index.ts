export interface Env {
  CF_API_KEY: string;
  CF_ACCOUNT_ID: string;
  CF_AI_MODEL?: string;
}

const DEFAULT_MODEL = 'gpt-4o-mini';

function cloudflareAiEndpoint(accountId: string) {
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/generate`;
}

async function callCloudflareAI(env: Env, input: string): Promise<string> {
  const model = env.CF_AI_MODEL || DEFAULT_MODEL;
  const url = cloudflareAiEndpoint(env.CF_ACCOUNT_ID);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.CF_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      input,
      max_output_tokens: 1200,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cloudflare AI request failed ${response.status} ${response.statusText}: ${text}`);
  }

  const data = await response.json();
  // Depending on Cloudflare API shape, adjust path
  return data?.output?.text ?? data?.result ?? '';
}

async function handleExtractReceiptData(env: Env, body: any) {
  const { base64Image } = body;
  if (!base64Image) throw new Error('Missing base64Image');

  const prompt = `Extract petrol receipt information from this image. Return a JSON object with the following fields: date (YYYY-MM-DD), amount (number MYR), liters (number), stationName (string), type (RON95|RON97|Diesel). If missing, set field to null.`;

  const text = await callCloudflareAI(env, `${prompt}\n\nImage-base64:${base64Image}`);

  try {
    return JSON.parse(text);
  } catch {
    return {}; // safe fallback
  }
}

async function handleVerifyUsage(env: Env, body: any) {
  const { record, history } = body;
  if (!record || !Array.isArray(history)) throw new Error('Missing record/history');

  const prompt = `As a Malaysian government petrol usage auditor, verify this record against the user's history and policy rules.\nRecord:\n${JSON.stringify(record, null, 2)}\nHistory (last 5):\n${JSON.stringify(history.slice(0, 5), null, 2)}\nPolicy rules:\n1. Duplicate check\n2. Consumption check\n3. Frequency check\nReturn a JSON object: {"status":"verified"|"flagged","notes":[...]} `;

  const text = await callCloudflareAI(env, prompt);

  try {
    const parsed = JSON.parse(text);
    return {
      status: parsed.status === 'verified' ? 'verified' : 'flagged',
      notes: Array.isArray(parsed.notes) ? parsed.notes.map(String) : ['Unable to parse notes'],
    };
  } catch {
    return { status: 'flagged', notes: ['Verification failed to process'] };
  }
}

async function handleFuelPrices(env: Env) {
  const prompt = `Provide current Malaysian fuel prices for West Malaysia and East Malaysia in JSON format with fields: RON95, RON95_Market, RON97, Diesel, RON95_SubsidyLimit.`;

  const text = await callCloudflareAI(env, prompt);

  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Unable to parse fuel prices response');
  }
}

export default {
  async fetch(request: Request, env: Env) {
    try {
      const url = new URL(request.url);
      if (request.method === 'GET' && url.pathname === '/fuelPrices') {
        const data = await handleFuelPrices(env);
        return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' }});
      }

      if (request.method === 'POST' && url.pathname === '/ai/extractReceiptData') {
        const body = await request.json();
        const data = await handleExtractReceiptData(env, body);
        return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' }});
      }

      if (request.method === 'POST' && url.pathname === '/ai/verifyUsage') {
        const body = await request.json();
        const data = await handleVerifyUsage(env, body);
        return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' }});
      }

      return new Response('Not Found', { status: 404 });
    } catch (error: any) {
      return new Response(JSON.stringify({ error: error.message || 'Unknown' }), { status: 500, headers: { 'Content-Type': 'application/json' }});
    }
  },
};
