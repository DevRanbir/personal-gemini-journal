import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient, generateGeminiContentWithFallback, SYSTEM_SECURITY_INSTRUCTIONS } from "@/lib/gemini";
import { createGroqChatCompletion } from "@/lib/groq-api";

function cleanPromptText(text: string): string {
  if (!text) return '';
  return text.split(/\[(USER|Attached|Data|Referenced|New Question)/i)[0].trim();
}

function summarizeUserPromptToHighlight(text: string): string {
  let clean = cleanPromptText(text);
  
  // Strip conversational fillers, corrections, & greetings at the start
  clean = clean.replace(/^(ye|yeh)\s+(galat|wrong)\s+hai,?\s*/i, '');
  clean = clean.replace(/^(aaj|ajj|aj|today|bhai|boss|yrr|yar|dost|bro),?\s*/i, '');
  clean = clean.replace(/^(pta\skya\shua|guess\swhat\shappened|guess\swhat|you\sknow\swhat),?\s*/i, '');
  clean = clean.replace(/^(aaj|ajj|aj|today),?\s*/i, '');
  clean = clean.replace(/^its?\s+on\s+/i, 'Birthday is on ');
  
  // Clean trailing punctuation
  clean = clean.replace(/[\.,\s]+$/, '');

  if (!clean) clean = text;

  // Capitalize first character
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function parseStructuredAiResponse(rawText: string, userMessage?: string) {
  let responseText = rawText;
  let userdataPoints: string[] = [];
  let actionObj: any = null;

  // Try to extract JSON from the raw text (handles markdown fences, surrounding text, etc.)
  const tryParseJson = (text: string): any | null => {
    const attempts = [
      // 1. Raw text as-is
      text.trim(),
      // 2. Strip ```json ... ``` fences
      text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim(),
      // 3. Extract first {...} block found anywhere in the text
      (() => {
        const match = text.match(/\{[\s\S]*\}/);
        return match ? match[0] : null;
      })(),
    ];

    for (const attempt of attempts) {
      if (!attempt) continue;
      try {
        const parsed = JSON.parse(attempt);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch {}
    }
    return null;
  };

  const parsed = tryParseJson(rawText);

  if (parsed) {
    const extractedReply = parsed.reply || parsed.response || parsed.message || parsed.text || parsed.answer;
    if (extractedReply && typeof extractedReply === 'string') {
      responseText = extractedReply;
    }
    userdataPoints = Array.isArray(parsed.userdata) ? parsed.userdata : [];
    actionObj = parsed.action || null;

    if (actionObj && actionObj.dataLog && Array.isArray(actionObj.dataLog.addPoints)) {
      userdataPoints = Array.from(new Set([...userdataPoints, ...actionObj.dataLog.addPoints]));
    }
  }

  // Filter junk from userdata
  userdataPoints = userdataPoints
    .map((pt: string) => cleanPromptText(pt))
    .filter((pt: string) => {
      if (!pt || typeof pt !== 'string') return false;
      const clean = pt.trim();
      if (clean.length < 4) return false;
      if (clean.endsWith('?')) return false;
      if (/^(what|why|how|when|where|who|can|could|would|is|are|do|does|did|tell|show|check|list|use)\b/i.test(clean)) return false;
      if (/\b(use calender|use calendar|tell me|know about me|search|check|look up)\b/i.test(clean)) return false;
      return true;
    })
    .map((pt: string) => summarizeUserPromptToHighlight(pt));

  // Fallback: If AI response didn't yield userdata JSON, but user shared a milestone/score or asked to record/log:
  if (userdataPoints.length === 0 && userMessage) {
    const isRecordingRequest = /\b(record|save|log|note)\b/i.test(userMessage);
    const hasPersonalFact = /\b(\d+%|\d+\/\d+|math|exam|test|scored?|got|passed|won|bought|chori|birthday|job|project)\b/i.test(userMessage);
    
    if (isRecordingRequest || hasPersonalFact) {
      const summary = summarizeUserPromptToHighlight(userMessage);
      if (summary && summary.length >= 4 && !summary.endsWith('?')) {
        userdataPoints.push(summary);
      }
    }
  }

  return {
    response: responseText,
    userdata: userdataPoints,
    action: actionObj,
  };
}


export async function POST(req: NextRequest) {
  try {
    const { message, previousMessages = [], systemPrompt } = await req.json();

    if (!message) {
      return NextResponse.json({ response: "Message is required." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (apiKey) {
      try {
        const ai = getGeminiClient();
        const contents = previousMessages.map((m: any) => ({
          role: m.sender === "user" || m.isUser ? "user" : "model",
          parts: [{ text: m.text || m.content }],
        }));

        contents.push({
          role: "user",
          parts: [{ text: message }],
        });

        const rawReply = await generateGeminiContentWithFallback(
          ai,
          {
            systemInstruction: systemPrompt || SYSTEM_SECURITY_INSTRUCTIONS,
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
          contents
        );

        if (rawReply) {
          const structured = parseStructuredAiResponse(rawReply, message);
          return NextResponse.json(structured);
        }
      } catch (geminiError: any) {
        console.error("Gemini API attempt failed:", geminiError.message);
        
        if (geminiError.message === "QUOTA_EXHAUSTED") {
          if (process.env.GROQ_API_KEY) {
            const fallbackResponse = await createGroqChatCompletion({
              messages: [
                { role: "system", content: systemPrompt || SYSTEM_SECURITY_INSTRUCTIONS },
                ...previousMessages.map((m: any) => ({
                  role: (m.sender === "user" || m.isUser ? "user" : "assistant") as "user" | "assistant",
                  content: m.text || m.content,
                })),
                { role: "user", content: message },
              ],
            });
            const structured = parseStructuredAiResponse(fallbackResponse, message);
            return NextResponse.json(structured);
          }

          return NextResponse.json({
            response: "Gemini API prepayment credits / quota are depleted for this key. Please update `GEMINI_API_KEY` in Secret Manager or Google AI Studio.",
          });
        }
      }
    }

    // Fallback to Groq API if configured
    if (process.env.GROQ_API_KEY) {
      const fallbackResponse = await createGroqChatCompletion({
        messages: [
          { role: "system", content: systemPrompt || SYSTEM_SECURITY_INSTRUCTIONS },
          ...previousMessages.map((m: any) => ({
            role: (m.sender === "user" || m.isUser ? "user" : "assistant") as "user" | "assistant",
            content: m.text || m.content,
          })),
          { role: "user", content: message },
        ],
      });
      const structured = parseStructuredAiResponse(fallbackResponse, message);
      return NextResponse.json(structured);
    }

    return NextResponse.json({
      response: "AI is initializing. Please ensure a valid `GEMINI_API_KEY` is configured in Secret Manager or Environment.",
    });

  } catch (error: any) {
    console.error("Error in Gemini API route:", error);
    return NextResponse.json({
      response: "Unable to complete request. Please check API Key and quota.",
    });
  }
}
