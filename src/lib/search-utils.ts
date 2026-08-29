import { createGroqChatCompletion } from '@/lib/groq-api';

export type SearchResult = {
  title: string;
  url: string;
  snippet: string;
};

export type SearchResponse = {
  query: string;
  results: SearchResult[];
  source: 'google' | 'wikipedia';
};

export async function rewriteSearchQuery(message: string, source: 'google' | 'wikipedia') {
  try {
    const response = await createGroqChatCompletion({
      messages: [
        {
          role: 'system',
          content: `Rewrite the user's message into a concise ${source === 'wikipedia' ? 'Wikipedia' : 'Google web'} search query. Return only the query text.`,
        },
        {
          role: 'user',
          content: message,
        },
      ],
      maxTokens: 80,
      temperature: 0.1,
    });

    const query = response.replace(/^["']|["']$/g, '').trim();

    if (
      !query ||
      query.toLowerCase().startsWith('groq is not configured') ||
      query.toLowerCase().startsWith('groq request failed')
    ) {
      return message;
    }

    return query;
  } catch (error) {
    console.error('Failed to rewrite search query:', error);
    return message;
  }
}

export function formatSearchEvidence(searches: SearchResponse[]) {
  if (searches.length === 0) {
    return '';
  }

  return searches
    .map((search) => {
      const results = search.results
        .slice(0, 5)
        .map((result, index) => (
          `${index + 1}. ${result.title}\nURL: ${result.url}\nSnippet: ${result.snippet}`
        ))
        .join('\n\n');

      return `[${search.source.toUpperCase()} SEARCH]\nQuery: ${search.query}\nResults:\n${results || 'No results found.'}`;
    })
    .join('\n\n');
}
