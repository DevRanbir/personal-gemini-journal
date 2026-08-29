import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient, generateGeminiContentWithFallback, SYSTEM_SECURITY_INSTRUCTIONS } from "@/lib/gemini";
import { createGroqChatCompletion } from "@/lib/groq-api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, prompt } = body;

    if (!prompt && (!messages || !Array.isArray(messages))) {
      return NextResponse.json(
        { error: "Invalid request payload. Must provide messages array or prompt." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (apiKey) {
      try {
        const ai = getGeminiClient();
        let contents = [];
        if (messages && messages.length > 0) {
          contents = messages.map((m: { role: string; content: string }) => ({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: m.content }],
          }));
        }

        if (prompt) {
          contents.push({
            role: "user",
            parts: [{ text: prompt }],
          });
        }

        const replyText = await generateGeminiContentWithFallback(
          ai,
          {
            systemInstruction: SYSTEM_SECURITY_INSTRUCTIONS,
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
          contents
        );

        if (replyText) {
          return NextResponse.json({ reply: replyText });
        }
      } catch (geminiError: any) {
        console.error("Gemini API error in /api/chat:", geminiError.message);
        if (geminiError.message === "QUOTA_EXHAUSTED" && process.env.GROQ_API_KEY) {
          const fallbackResponse = await createGroqChatCompletion({
            messages: [
              { role: "system", content: SYSTEM_SECURITY_INSTRUCTIONS },
              { role: "user", content: prompt || (messages && messages[messages.length - 1]?.content) || "Hello" },
            ],
          });
          return NextResponse.json({ reply: fallbackResponse });
        }
      }
    }

    if (process.env.GROQ_API_KEY) {
      const fallbackResponse = await createGroqChatCompletion({
        messages: [
          { role: "system", content: SYSTEM_SECURITY_INSTRUCTIONS },
          { role: "user", content: prompt || (messages && messages[messages.length - 1]?.content) || "Hello" },
        ],
      });
      return NextResponse.json({ reply: fallbackResponse });
    }

    return NextResponse.json({ reply: "I'm here to listen and assist with your reflections." });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate AI response securely." },
      { status: 500 }
    );
  }
}
