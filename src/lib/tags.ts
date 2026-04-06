export function normalizeTag(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?]+$/, '');
}

export function splitTags(tagString: string | null | undefined): string[] {
  if (!tagString || !tagString.trim()) return [];
  const tags = tagString
    .split(',')
    .map(normalizeTag)
    .filter((t) => t.length > 0);
  return [...new Set(tags)];
}
