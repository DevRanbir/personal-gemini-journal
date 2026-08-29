import { GoogleGenAI } from "@google/genai";

type GroqMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type GroqChatCompletion = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

export const getGroqModelCandidates = (): string[] => {
  const candidates = [
    process.env.GROQ_MODEL,
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
  ].filter(Boolean) as string[];

  return [...new Set(candidates)];
};

export const createGroqChatCompletion = async (options: {
  messages: GroqMessage[];
  maxTokens?: number;
  temperature?: number;
}): Promise<string> => {
  // Check Gemini API key first for Cloud Run Ideathon compliance
  const geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const systemMsg = options.messages.find((m) => m.role === 'system')?.content || '';
      const conversation = options.messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }],
        }));

      const modelCandidates = ['gemini-3.5-flash-lite', 'gemini-2.5-flash-lite', 'gemini-1.5-flash', 'gemini-2.0-flash'];

      for (const model of modelCandidates) {
        try {
          const res = await ai.models.generateContent({
            model,
            config: {
              systemInstruction: systemMsg,
              maxOutputTokens: options.maxTokens ?? 1500,
              temperature: options.temperature ?? 0.7,
            },
            contents: conversation.length > 0 ? conversation : [{ role: 'user', parts: [{ text: 'Hello' }] }],
          });

          if (res.text) {
            return res.text.trim();
          }
        } catch (mErr: any) {
          // Model quota reached or unavailable, try next candidate
        }
      }
    } catch (err) {
      // Gemini API failed or quota exhausted, fall through to Groq
    }
  }

  // Fallback to Groq API key if configured
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return 'Gemini / Groq AI is initializing. Please ensure GEMINI_API_KEY is configured in Secret Manager / Environment.';
  }

  let lastError: unknown;

  for (const model of getGroqModelCandidates()) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: options.messages,
          max_tokens: options.maxTokens ?? 300,
          temperature: options.temperature ?? 0.7,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        lastError = data;
        continue;
      }

      const content = (data as GroqChatCompletion).choices?.[0]?.message?.content?.trim();
      if (content) {
        return content;
      }

      lastError = data;
    } catch (error) {
      lastError = error;
    }
  }

  console.error('Groq chat completion failed:', lastError);
  return 'AI request failed. Check API key and model access.';
};
