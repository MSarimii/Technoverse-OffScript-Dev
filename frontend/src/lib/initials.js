const TITLE_RE = /^(dr|prof|mr|mrs|ms|engr)\.?\s+/i;

/**
 * Strip leading academic/honorific titles and return up to 2 uppercase initials.
 */
export function getInitials(name) {
  if (!name || typeof name !== 'string') return 'U';
  let cleaned = name.trim();
  while (TITLE_RE.test(cleaned)) {
    cleaned = cleaned.replace(TITLE_RE, '').trim();
  }
  if (!cleaned) return 'U';
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
