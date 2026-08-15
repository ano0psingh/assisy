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

    // `*` is included because the model emits it far more often than `-`, and a
    // leading `* ` cannot be emphasis: the italic rule above requires a
    // non-space immediately after the asterisk, so it has already been skipped.
    const bulletMatch = trimmed.match(/^[-•*]\s+(.*)/);
    if (bulletMatch) {
      if (!inUl) {
        if (inOl) { result.push('</ol>'); inOl = false; }
        result.push('<ul class="list-disc pl-6 space-y-1">');
        inUl = true;
      }
      result.push(`<li>${bulletMatch[1]}</li>`);
      continue;
    }

    const numMatch = trimmed.match(/^\d+\.\s+(.*)/);
    if (numMatch) {
      if (!inOl) {
        if (inUl) { result.push('</ul>'); inUl = false; }
        result.push('<ol class="list-decimal pl-6 space-y-1">');
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
