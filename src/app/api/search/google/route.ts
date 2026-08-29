import { NextRequest, NextResponse } from 'next/server';
import { rewriteSearchQuery, type SearchResult } from '@/lib/search-utils';

type DuckDuckGoTopic = {
  FirstURL?: string;
  Text?: string;
  Result?: string;
  Topics?: DuckDuckGoTopic[];
};

type DuckDuckGoResponse = {
  AbstractText?: string;
  AbstractURL?: string;
  Heading?: string;
  RelatedTopics?: DuckDuckGoTopic[];
};

type GoogleSearchItem = {
  title?: string;
  link?: string;
  snippet?: string;
};

const decodeHtml = (value: string = '') => (
  value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
);

const stripHtml = (value: string = '') => (
  decodeHtml(value.replace(/<[^>]*>/g, ' '))
);

const flattenTopics = (topics: DuckDuckGoTopic[] = []): DuckDuckGoTopic[] => {
  return topics.flatMap((topic) => (
    topic.Topics ? flattenTopics(topic.Topics) : [topic]
  ));
};

const titleFromTopic = (topic: DuckDuckGoTopic) => {
  const text = topic.Text || '';
  return text.split(' - ')[0] || text.slice(0, 80) || 'Search result';
};

const decodeDuckDuckGoUrl = (href: string) => {
  const decodedHref = decodeHtml(href);

  try {
    const url = new URL(decodedHref.startsWith('//') ? `https:${decodedHref}` : decodedHref);
    const redirectedUrl = url.searchParams.get('uddg');

    if (redirectedUrl) {
      return decodeURIComponent(redirectedUrl);
    }

    return url.href;
  } catch {
    return decodedHref;
  }
};

async function fetchDuckDuckGoHtmlResults(query: string): Promise<SearchResult[]> {
  try {
    const searchUrl = new URL('https://html.duckduckgo.com/html/');
    searchUrl.searchParams.set('q', query);

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 Harmony/1.0',
        Accept: 'text/html',
      },
      next: { revalidate: 300 },
    });
    const html = await response.text();
    const blocks = html.match(/<div class="result results_links[\s\S]*?<\/div>\s*<\/div>/g) ?? [];

    return blocks
      .map((block): SearchResult | null => {
        const linkMatch = block.match(/<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
        const snippetMatch = block.match(/<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/)
          ?? block.match(/<div[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/div>/);

        if (!linkMatch) {
          return null;
        }

        return {
          title: stripHtml(linkMatch[2]) || 'Web result',
          url: decodeDuckDuckGoUrl(linkMatch[1]),
          snippet: stripHtml(snippetMatch?.[1] ?? ''),
        };
      })
      .filter((result): result is SearchResult => Boolean(result?.title && result.url))
      .slice(0, 5);
  } catch (error) {
    console.error('DuckDuckGo HTML search failed:', error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ query: '', results: [], source: 'google' });
    }

    const query = await rewriteSearchQuery(message, 'google');

    const googleApiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const googleCx = process.env.GOOGLE_SEARCH_CX;

    if (googleApiKey && googleCx) {
      const googleUrl = new URL('https://www.googleapis.com/customsearch/v1');
      googleUrl.searchParams.set('key', googleApiKey);
      googleUrl.searchParams.set('cx', googleCx);
      googleUrl.searchParams.set('q', query);
      googleUrl.searchParams.set('num', '5');

      const googleResponse = await fetch(googleUrl, { next: { revalidate: 300 } });
      const googleData = await googleResponse.json();
      const googleResults = ((googleData.items ?? []) as GoogleSearchItem[])
        .map((item): SearchResult => ({
          title: item.title || 'Google result',
          url: item.link || `https://www.google.com/search?q=${encodeURIComponent(query)}`,
          snippet: item.snippet || '',
        }));

      if (googleResults.length > 0) {
        return NextResponse.json({ query, results: googleResults, source: 'google' });
      }
    }

    const searchUrl = new URL('https://api.duckduckgo.com/');
    searchUrl.searchParams.set('q', query);
    searchUrl.searchParams.set('format', 'json');
    searchUrl.searchParams.set('no_html', '1');
    searchUrl.searchParams.set('skip_disambig', '1');

    const response = await fetch(searchUrl, {
      headers: { 'User-Agent': 'Harmony/1.0' },
      next: { revalidate: 300 },
    });
    const data = (await response.json()) as DuckDuckGoResponse;

    const results: SearchResult[] = [];

    if (data.AbstractText) {
      results.push({
        title: data.Heading || query,
        url: data.AbstractURL || `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        snippet: data.AbstractText,
      });
    }

    for (const topic of flattenTopics(data.RelatedTopics).slice(0, 8)) {
      if (!topic.Text) {
        continue;
      }

      results.push({
        title: titleFromTopic(topic),
        url: topic.FirstURL || `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        snippet: topic.Text,
      });
    }

    if (results.length === 0) {
      results.push(...await fetchDuckDuckGoHtmlResults(query));
    }

    if (results.length === 0) {
      results.push({
        title: 'No web snippets found',
        url: '',
        snippet: `No search result snippets were available for "${query}". Answer from existing context if possible, and say when current web evidence is unavailable.`,
      });
    }

    return NextResponse.json({ query, results: results.slice(0, 5), source: 'google' });
  } catch (error) {
    console.error('Google-style search failed:', error);
    return NextResponse.json({ query: '', results: [], source: 'google' });
  }
}
