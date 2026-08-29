import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Text is required to extract action items." },
        { status: 400 }
      );
    }

    const ai = getGeminiClient();

    const prompt = `
Extract actionable tasks and commitments from the following journal text.
Return a valid JSON array of strings containing short, clear action items.
If no explicit action items exist, extract 2-3 logical next steps or self-reflection goals.

Strict format:
["Task 1 description", "Task 2 description"]

JOURNAL TEXT:
${text.slice(0, 3000)}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const jsonText = response.text || "[]";
    const actionItems = JSON.parse(jsonText);

    return NextResponse.json({ tasks: Array.isArray(actionItems) ? actionItems : [] });
  } catch (error: any) {
    console.error("Action Items Extraction Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to extract action items." },
      { status: 500 }
    );
  }
}
