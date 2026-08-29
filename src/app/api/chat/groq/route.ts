import { NextRequest, NextResponse } from 'next/server';
import { createGroqChatCompletion } from '@/lib/groq-api';

type ChatHistoryItem = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

const chatSessions = new Map<string, { history: ChatHistoryItem[] }>();

export async function POST(request: NextRequest) {
  try {
    const { message, chatId, userId, previousMessages = [], systemPrompt } = await request.json();

    if (!message || !chatId) {
      return NextResponse.json({ response: 'Message and chatId are required.' });
    }

    const sessionKey = `${userId || 'anonymous'}-${chatId}`;
    let chat = chatSessions.get(sessionKey);

    if (!chat) {
      const defaultSystemPrompt = `You are Harmony by Ranbir. Be extremely concise. Answer directly with essential info only. Max 2-3 sentences. No verbose explanations. Use minimal tables if needed.

IMPORTANT CHART CAPABILITIES: You CAN create visual charts. When users ask for charts or graphs, provide JSON data in code blocks using the exact chart type they request.

Chart examples:
- Line chart: {"type": "line", "data": [{"x": "A", "y": 10}, {"x": "B", "y": 20}], "xKey": "x", "yKey": "y"}
- Bar chart: {"type": "bar", "data": [{"category": "A", "value": 10}], "xKey": "category", "yKey": "value"}
- Pie chart: {"type": "pie", "data": [{"name": "A", "value": 30}], "xKey": "name", "yKey": "value"}
- Scatter chart: {"type": "scatter", "data": [{"x": 1, "y": 2}], "xKey": "x", "yKey": "y"}
- Area chart: {"type": "area", "data": [{"x": "A", "y": 10}], "xKey": "x", "yKey": "y"}`;

      const history: ChatHistoryItem[] = [
        {
          role: 'system',
          content: systemPrompt || defaultSystemPrompt,
        },
      ];

      for (const msg of previousMessages.slice(-10)) {
        const text = typeof msg.content === 'string' ? msg.content : msg.text;
        const isUser = typeof msg.isUser === 'boolean' ? msg.isUser : msg.sender === 'user';

        if (text && typeof text === 'string') {
          history.push({
            role: isUser ? 'user' : 'assistant',
            content: text,
          });
        }
      }

      chat = { history };
    }

    if (systemPrompt) {
      const systemIndex = chat.history.findIndex(item => item.role === 'system');

      if (systemIndex >= 0) {
        chat.history[systemIndex] = { role: 'system', content: systemPrompt };
      } else {
        chat.history.unshift({ role: 'system', content: systemPrompt });
      }
    }

    const needsLongResponse =
      /\[(GOOGLE|WIKIPEDIA) SEARCH\]/.test(message) ||
      /chart-ready JSON|markdown table|Sources heading|ALGORITHM MODE/i.test(`${message}\n${systemPrompt ?? ''}`);

    const aiResponse = await createGroqChatCompletion({
      messages: [...chat.history, { role: 'user', content: message }],
      maxTokens: needsLongResponse ? 1800 : 700,
      temperature: 0.7,
    });

    chat.history = [
      ...chat.history,
      { role: 'user', content: message },
      { role: 'assistant', content: aiResponse },
    ];
    chatSessions.set(sessionKey, chat);

    return NextResponse.json({ response: aiResponse });
  } catch (error) {
    console.error('Error in Groq API route:', error);
    return NextResponse.json({
      response: 'Groq request failed. Check GROQ_API_KEY, GROQ_MODEL, and your Groq model access.',
    });
  }
}
