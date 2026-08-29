import { NextRequest, NextResponse } from 'next/server';
import { rewriteSearchQuery, type SearchResult } from '@/lib/search-utils';

type WikiSearchItem = {
  title: string;
  pageid: number;
  snippet?: string;
};

type WikiSummary = {
  title?: string;
  extract?: string;
  content_urls?: {
    desktop?: {
      page?: string;
    };
  };
};

type WikiParseResponse = {
  parse?: {
    title?: string;
    text?: {
      '*': string;
    };
    links?: Array<{
      ns: number;
      exists?: boolean;
      '*': string;
    }>;
  };
};

const wikiHeaders = { 'User-Agent': 'Harmony/1.0' };

const stripHtml = (value: string = '') => (
  value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
);

const wikiUrlForTitle = (title: string) => (
  `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/\s/g, '_')).replace(/%3A/g, ':')}`
);

async function readWikipediaJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();

  if (!response.ok) {
    console.warn('Wikipedia request failed:', response.status, text.slice(0, 120));
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    console.warn('Wikipedia returned non-JSON response:', text.slice(0, 120));
    return null;
  }
}

const detectAviationAccidentYear = (message: string) => {
  const normalized = message.toLowerCase();
  const hasAviationTerm = /\b(plane|aircraft|airliner|aviation|flight|air|helicopter)\b/.test(normalized);
  const hasAccidentTerm = /\b(crash|crashes|accident|accidents|incident|incidents|disaster|disasters)\b/.test(normalized);
  const year = normalized.match(/\b(19|20)\d{2}\b/)?.[0];

  return hasAviationTerm && hasAccidentTerm && year ? year : null;
};

async function searchWikipedia(query: string, namespace = '0|10') {
  const searchUrl = new URL('https://en.wikipedia.org/w/api.php');
  searchUrl.searchParams.set('action', 'query');
  searchUrl.searchParams.set('list', 'search');
  searchUrl.searchParams.set('format', 'json');
  searchUrl.searchParams.set('origin', '*');
  searchUrl.searchParams.set('srlimit', '8');
  searchUrl.searchParams.set('srnamespace', namespace);
  searchUrl.searchParams.set('srsearch', query);

  const searchResponse = await fetch(searchUrl, {
    headers: wikiHeaders,
    next: { revalidate: 300 },
  });
  const searchData = await readWikipediaJson<{ query?: { search?: WikiSearchItem[] } }>(searchResponse);
  return (searchData?.query?.search ?? []) as WikiSearchItem[];
}

async function fetchTemplateResult(title: string): Promise<SearchResult | null> {
  const fallbackResult = {
    title,
    url: wikiUrlForTitle(title),
    snippet: 'Wikipedia template page that groups related aviation accident and incident articles.',
  };

  try {
    const parseUrl = new URL('https://en.wikipedia.org/w/api.php');
    parseUrl.searchParams.set('action', 'parse');
    parseUrl.searchParams.set('page', title);
    parseUrl.searchParams.set('prop', 'text|links');
    parseUrl.searchParams.set('format', 'json');
    parseUrl.searchParams.set('origin', '*');

    const parseResponse = await fetch(parseUrl, {
      headers: wikiHeaders,
      next: { revalidate: 300 },
    });
    const data = await readWikipediaJson<WikiParseResponse>(parseResponse);
    const parsedTitle = data?.parse?.title;

    if (!parsedTitle) {
      return fallbackResult;
    }

    const linkTitles = (data?.parse?.links ?? [])
      .filter((link) => link.ns === 0 && link.exists !== false)
      .map((link) => link['*'])
      .filter(Boolean)
      .slice(0, 20);
    const parsedText = stripHtml(data?.parse?.text?.['*']).slice(0, 500);
    const snippet = linkTitles.length > 0
      ? `Wikipedia template covering related pages: ${linkTitles.join('; ')}.`
      : parsedText;

    return {
      title: parsedTitle,
      url: wikiUrlForTitle(parsedTitle),
      snippet,
    };
  } catch (error) {
    console.warn('Wikipedia template fetch failed:', error);
    return fallbackResult;
  }
}

async function resultFromSearchItem(item: WikiSearchItem): Promise<SearchResult> {
  if (item.title.startsWith('Template:')) {
    const templateResult = await fetchTemplateResult(item.title);

    if (templateResult) {
      return templateResult;
    }
  }

  try {
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(item.title)}`;
    const summaryResponse = await fetch(summaryUrl, {
      headers: wikiHeaders,
      next: { revalidate: 300 },
    });
    const summary = await readWikipediaJson<WikiSummary>(summaryResponse);

    return {
      title: summary?.title || item.title,
      url: summary?.content_urls?.desktop?.page || `https://en.wikipedia.org/?curid=${item.pageid}`,
      snippet: summary?.extract || stripHtml(item.snippet),
    };
  } catch {
    return {
      title: item.title,
      url: `https://en.wikipedia.org/?curid=${item.pageid}`,
      snippet: stripHtml(item.snippet),
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ query: '', results: [], source: 'wikipedia' });
    }

    const query = await rewriteSearchQuery(message, 'wikipedia');
    const aviationYear = detectAviationAccidentYear(`${message} ${query}`);
    const searchItems = [
      ...(aviationYear ? await searchWikipedia(`Template:Aviation accidents and incidents in ${aviationYear}`, '10') : []),
      ...(aviationYear ? await searchWikipedia(`Aviation accidents and incidents in ${aviationYear}`, '0|10') : []),
      ...await searchWikipedia(query, '0|10'),
      ...await searchWikipedia(message, '0|10'),
    ];
    const uniqueItems = Array.from(
      new Map(searchItems.map((item) => [item.title, item])).values(),
    );

    const explicitTemplateTitle = aviationYear
      ? `Template:Aviation accidents and incidents in ${aviationYear}`
      : null;
    const explicitTemplateResult = explicitTemplateTitle
      ? await fetchTemplateResult(explicitTemplateTitle)
      : null;

    const results: SearchResult[] = [];
    const itemsToFetch = uniqueItems
      .filter((item) => item.title !== explicitTemplateTitle)
      .slice(0, 6);

    for (const item of itemsToFetch) {
      results.push(await resultFromSearchItem(item));
    }

    const mergedResults = [
      ...(explicitTemplateResult ? [explicitTemplateResult] : []),
      ...results,
    ];
    const uniqueResults = Array.from(
      new Map(mergedResults.map((result) => [result.url, result])).values(),
    ).slice(0, 5);

    return NextResponse.json({ query, results: uniqueResults, source: 'wikipedia' });
  } catch (error) {
    console.error('Wikipedia search failed:', error);
    return NextResponse.json({ query: '', results: [], source: 'wikipedia' });
  }
}
