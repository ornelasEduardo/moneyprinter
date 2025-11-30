import { getThemePreference } from '@/lib/themes/actions';
import { themes, ThemeKey } from '@/lib/themes';

export async function ThemeStyleTag() {
  const currentTheme = await getThemePreference();
  
  // Fallback to 'default' if the theme key doesn't exist (e.g., after renaming)
  const theme = themes[currentTheme as ThemeKey] || themes.default;
  const themeVars = theme.variables;

  // Generate CSS variable overrides as inline style
  const cssVars = Object.entries(themeVars)
    .map(([key, value]) => `${key}: ${value};`)
    .join('\n    ');

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
:root {
  ${cssVars}
}
        `.trim(),
      }}
    />
  );
}
