import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient } from "@/lib/gemini";

const EMPTY_MESSAGE = "Not enough data yet";

const extractJson = (text: string) => {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("AI did not return valid JSON.");
  }
  return cleaned.slice(firstBrace, lastBrace + 1);
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const journalEntries = typeof body.journalEntries === "string"
      ? body.journalEntries
      : typeof body.entries === "string"
        ? body.entries
        : Array.isArray(body.entries)
          ? body.entries.join("\n")
          : "";

    const calendarEvents = Array.isArray(body.calendarEvents) ? body.calendarEvents : [];
    const todoItems = Array.isArray(body.todoItems) ? body.todoItems : [];
    const sourceStats = body.sourceStats || {};
    const sourceText = journalEntries.trim();

    if (!sourceText && calendarEvents.length === 0 && todoItems.length === 0) {
      return NextResponse.json(
        { error: "Journal, calendar, or todo data is required for insight analysis." },
        { status: 400 }
      );
    }

    const ai = getGeminiClient();

    const prompt = `
You are Harmony's private journal analytics engine. Analyze only the user-provided source data below.
Return valid JSON only. No markdown. No diagnosis. Do not infer medical conditions.
If a section has no explicit supporting source data, use "${EMPTY_MESSAGE}" and empty arrays.
Social and finance sections must only contain user-visible extracted information from voluntary logs, never sensitive relationship or financial diagnosis.

Required JSON shape:
{
  "summary": "brief empathetic synthesis grounded in the source data",
  "emotions": {
    "summary": "journal-pattern wording only",
    "scores": [
      { "name": "Mood", "value": 0 },
      { "name": "Happiness", "value": 0 },
      { "name": "Stress", "value": 0 },
      { "name": "Anxiety", "value": 0 },
      { "name": "Motivation", "value": 0 },
      { "name": "Energy", "value": 0 },
      { "name": "Confidence", "value": 0 },
      { "name": "Calmness", "value": 0 }
    ],
    "sentimentDays": [
      { "name": "Positive", "value": 0 },
      { "name": "Neutral", "value": 0 },
      { "name": "Negative", "value": 0 }
    ],
    "trend": "improving, declining, mixed, stable, or Not enough data yet"
  },
  "goals": { "summary": "", "active": [], "completed": [], "abandoned": [], "repeatedNotActedOn": [], "progressPercent": 0 },
  "learning": { "summary": "", "topics": [{ "name": "", "value": 0 }], "knowledgeGaps": [], "repeatedQuestions": [], "mastered": [], "struggling": [] },
  "productivity": { "summary": "", "tasksCreated": 0, "tasksCompleted": 0, "tasksPostponed": 0, "deepWorkDays": [], "blockers": [] },
  "sleepEnergy": { "summary": "", "items": [] },
  "habits": { "summary": "", "items": [{ "name": "", "consistency": 0 }] },
  "social": { "summary": "", "peopleOrTopics": [{ "name": "", "value": 0 }], "positiveInteractions": [], "negativeInteractions": [] },
  "finance": { "summary": "", "themes": [{ "name": "", "value": 0 }] },
  "interests": { "summary": "", "items": [{ "name": "", "trend": "up|down|flat", "value": 0 }] },
  "journalStats": { "summary": "", "entriesPerWeek": 0, "entriesPerMonth": 0, "journalingStreak": 0, "mostActiveDay": "" },
  "recurringThemes": { "summary": "", "items": [{ "theme": "", "frequency": 0, "sentiment": "" }] },
  "remindersAndIdeas": { "summary": "", "commitments": [], "upcomingReminders": [], "ideas": [{ "type": "", "text": "" }] }
}

SOURCE STATS:
${JSON.stringify(sourceStats).slice(0, 2000)}

JOURNAL HIGHLIGHTS:
${sourceText.slice(0, 9000)}

CALENDAR EVENTS:
${JSON.stringify(calendarEvents).slice(0, 5000)}

TODO ITEMS:
${JSON.stringify(todoItems).slice(0, 5000)}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const jsonText = extractJson(response.text || "{}");
    const insightsData = JSON.parse(jsonText);

    return NextResponse.json(insightsData);
  } catch (error: any) {
    console.error("Insights Generation Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate journal insights." },
      { status: 500 }
    );
  }
}
