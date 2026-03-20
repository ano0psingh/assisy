/**
 * Converts AI-generated markdown text to sanitized HTML.
 * Handles bold, italic, bullet lists, numbered lists, and paragraph breaks.
 */
export function formatAIText(text: string): string {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(?<!\w)\*(?!\s)(.*?)(?<!\s)\*(?!\w)/g, '<em>$1</em>');

  const lines = html.split('\n');
  const result: string[] = [];
  let inUl = false;
  let inOl = false;

  for (const line of lines) {
    const trimmed = line.trim();

    const bulletMatch = trimmed.match(/^[-•]\s+(.*)/);
    if (bulletMatch) {
      if (!inUl) {
        if (inOl) { result.push('</ol>'); inOl = false; }
        result.push('<ul class="list-disc pl-5 space-y-1">');
        inUl = true;
      }
      result.push(`<li>${bulletMatch[1]}</li>`);
      continue;
    }

    const numMatch = trimmed.match(/^\d+\.\s+(.*)/);
    if (numMatch) {
      if (!inOl) {
        if (inUl) { result.push('</ul>'); inUl = false; }
        result.push('<ol class="list-decimal pl-5 space-y-1">');
        inOl = true;
      }
      result.push(`<li>${numMatch[1]}</li>`);
      continue;
    }

    if (inUl) { result.push('</ul>'); inUl = false; }
    if (inOl) { result.push('</ol>'); inOl = false; }

    if (trimmed === '') {
      result.push('<br/>');
    } else {
      result.push(`<p>${trimmed}</p>`);
    }
  }

  if (inUl) result.push('</ul>');
  if (inOl) result.push('</ol>');

  return result.join('');
}
