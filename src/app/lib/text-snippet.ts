/**
 * Strip Markdown and inline HTML to a plaintext preview, truncated to
 * `maxLength` characters with an ellipsis. Returns '' (falsy) when the
 * input is empty so templates can use `@if (snippet())` to skip rendering
 * an empty preview line.
 */
export function textSnippet(body: string | undefined, maxLength = 140): string {
  if (!body) {
    return '';
  }
  const text = body
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#*_`~>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > maxLength
    ? text.slice(0, maxLength).trim() + '...'
    : text;
}
