const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

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

export async function fetchRSSFeed(feedUrl: string): Promise<RSSFeedMeta> {
  const res = await fetch(CORS_PROXY + encodeURIComponent(feedUrl));
  if (!res.ok) throw new Error(`Failed to fetch feed: ${res.status}`);
  const xml = await res.text();
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
  const res = await fetch(CORS_PROXY + encodeURIComponent(url));
  if (!res.ok) throw new Error(`Failed to fetch article: ${res.status}`);
  const html = await res.text();
  return extractTextFromHTML(html);
}

export function estimateReadingTime(text: string): number {
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.round(words / 230));
}
