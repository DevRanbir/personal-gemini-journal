import { NextRequest, NextResponse } from 'next/server';
import { createGroqChatCompletion } from '@/lib/groq-api';

const createFallbackTitle = (message: string): string => {
  const words = message
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6);

  if (words.length === 0) {
    return 'New Chat';
  }

  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .slice(0, 50);
};

export async function POST(request: NextRequest) {
  let fallbackMessage = '';

  try {
    const { message } = await request.json();
    fallbackMessage = message || '';
    
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const prompt = `Generate a short, descriptive title (3-6 words max) for a chat conversation that starts with this message: "${message}"

Rules:
- Keep it under 50 characters
- Make it descriptive but concise
- Don't use quotes or special characters
- Focus on the main topic or intent
- Examples: "Weather in Paris", "Python Tutorial Help", "Recipe for Pasta"

Title:`;

    let title = await createGroqChatCompletion({
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 24,
      temperature: 0.2,
    });

    if (title.startsWith('Groq is not configured') || title.startsWith('Groq request failed')) {
      return NextResponse.json({ title: createFallbackTitle(message) });
    }

    // Clean up the title
    title = title.replace(/^["']|["']$/g, ''); // Remove quotes
    title = title.replace(/^Title:\s*/i, ''); // Remove "Title:" prefix
    title = title.slice(0, 50); // Ensure max length

    return NextResponse.json({ title });

  } catch (error) {
    console.error('Error generating title:', error);
    return NextResponse.json({ title: createFallbackTitle(fallbackMessage) });
  }
}
