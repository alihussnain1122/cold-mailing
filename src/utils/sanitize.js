/**
 * Sanitize HTML to prevent XSS attacks
 * Uses DOMPurify for robust sanitization
 */
import DOMPurify from 'dompurify';

// Configure DOMPurify
const config = {
  ALLOWED_TAGS: [
    'b', 'i', 'u', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
    'span', 'div', 'table', 'tr', 'td', 'th', 'thead', 'tbody',
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
  ALLOW_DATA_ATTR: false,
};

export function sanitizeHtml(html) {
  if (!html) return '';
  return DOMPurify.sanitize(html, config);
}

export function sanitizeAndFormat(html) {
  if (!html) return '';
  // Replace newlines with <br> before sanitizing
  const formatted = html.replace(/\n/g, '<br>');
  return DOMPurify.sanitize(formatted, config);
}
