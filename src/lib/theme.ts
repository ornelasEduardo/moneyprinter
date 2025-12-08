import { cookies } from 'next/headers';
import { ThemeKey } from 'doom-design-system';

export async function getThemePreference(): Promise<ThemeKey> {
  const cookieStore = await cookies();
  const theme = cookieStore.get('theme');
  // Default to 'default' if no cookie or invalid value
  // We cast to ThemeKey, but ideally we should validate against available themes
  return (theme?.value as ThemeKey) || 'default';
}
