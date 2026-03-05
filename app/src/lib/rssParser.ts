export interface RSSItem {
  title: string;
  link: string;
  author: string;
  pubDate: string;
  content: string;
}

export interface RSSFeedMeta {
  title: string;
  siteUrl: string;
  items: RSSItem[];
}

interface Rss2JsonItem {
  title: string;
  link: string;
  author: string;
  pubDate: string;
  content: string;
  description: string;
}

interface Rss2JsonResponse {
  status: string;
  feed: { title: string; link: string };
  items: Rss2JsonItem[];
}

async function fetchViaRss2Json(feedUrl: string): Promise<RSSFeedMeta | null> {
  try {
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
    const res = await fetch(apiUrl);
    if (!res.ok) return null;
    const data: Rss2JsonResponse = await res.json();
    if (data.status !== 'ok') return null;
    return {
      title: data.feed.title ?? feedUrl,
      siteUrl: data.feed.link ?? '',
      items: data.items.map(item => ({
        title: item.title ?? '(no title)',
        link: item.link ?? '',
        author: item.author ?? '',
        pubDate: item.pubDate ?? '',
        content: item.content || item.description || '',
      })),
    };
  } catch { return null; }
}

async function proxyFetch(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  const proxies = [
    (u: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
    (u: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
  ];

  for (const makeUrl of proxies) {
    try {
      const res = await fetch(makeUrl(url), { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const contentType = res.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        const json = await res.json();
        return json.contents ?? '';
      }
      return await res.text();
    } catch { /* try next proxy */ }
  }
  clearTimeout(timeout);
  throw new Error('All CORS proxies failed');
}

export async function fetchRSSFeed(feedUrl: string): Promise<RSSFeedMeta> {
  const jsonResult = await fetchViaRss2Json(feedUrl);
  if (jsonResult && jsonResult.items.length > 0) return jsonResult;

  const xml = await proxyFetch(feedUrl);
  return parseRSSXml(xml, feedUrl);
}

function parseRSSXml(xml: string, feedUrl: string): RSSFeedMeta {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');

  const isAtom = !!doc.querySelector('feed');

  if (isAtom) return parseAtom(doc, feedUrl);
  return parseRSS2(doc, feedUrl);
}

function parseRSS2(doc: Document, feedUrl: string): RSSFeedMeta {
  const channel = doc.querySelector('channel');
  const title = channel?.querySelector('title')?.textContent ?? feedUrl;
  const siteUrl = channel?.querySelector('link')?.textContent ?? '';

  const items: RSSItem[] = [];
  channel?.querySelectorAll('item').forEach(item => {
    const encoded = item.getElementsByTagName('content:encoded')[0]?.textContent;
    const desc = item.querySelector('description')?.textContent;
    items.push({
      title: item.querySelector('title')?.textContent ?? '(no title)',
      link: item.querySelector('link')?.textContent ?? '',
      author: item.querySelector('creator')?.textContent
        ?? item.getElementsByTagName('dc:creator')[0]?.textContent
        ?? item.querySelector('author')?.textContent ?? '',
      pubDate: item.querySelector('pubDate')?.textContent ?? '',
      content: encoded ?? desc ?? '',
    });
  });

  return { title, siteUrl, items };
}

function parseAtom(doc: Document, feedUrl: string): RSSFeedMeta {
  const feed = doc.querySelector('feed');
  const title = feed?.querySelector('title')?.textContent ?? feedUrl;
  const siteLink = feed?.querySelector('link[rel="alternate"]')?.getAttribute('href')
    ?? feed?.querySelector('link')?.getAttribute('href') ?? '';

  const items: RSSItem[] = [];
  feed?.querySelectorAll('entry').forEach(entry => {
    const content = entry.querySelector('content')?.textContent
      ?? entry.querySelector('summary')?.textContent ?? '';
    const link = entry.querySelector('link[rel="alternate"]')?.getAttribute('href')
      ?? entry.querySelector('link')?.getAttribute('href') ?? '';
    items.push({
      title: entry.querySelector('title')?.textContent ?? '(no title)',
      link,
      author: entry.querySelector('author name')?.textContent ?? '',
      pubDate: entry.querySelector('published')?.textContent
        ?? entry.querySelector('updated')?.textContent ?? '',
      content,
    });
  });

  return { title, siteUrl: siteLink, items };
}

export function extractTextFromHTML(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;

  div.querySelectorAll('script, style, nav, footer, header, iframe, img, svg').forEach(el => el.remove());

  const text = (div.textContent ?? '').replace(/\s+/g, ' ').trim();
  return text;
}

export async function fetchArticleContent(url: string): Promise<string> {
  const html = await proxyFetch(url);
  return extractTextFromHTML(html);
}

export function estimateReadingTime(text: string): number {
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.round(words / 230));
}
