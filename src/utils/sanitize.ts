import DOMPurify from 'dompurify';

/**
 * Sanitizes TipTap-generated HTML.
 * Preserves `style` attributes (needed for text-align from TipTap)
 * while stripping all script/event-handler vectors.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_ATTR: ['style', 'class', 'href', 'target', 'rel'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
    FORCE_BODY: true,
  });
}
