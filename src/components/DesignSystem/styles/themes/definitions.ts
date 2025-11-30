const baseVariables = {
  // Typography Scale
  '--text-xs': '0.75rem',
  '--text-sm': '0.875rem',
  '--text-base': '1rem',
  '--text-lg': '1.125rem',
  '--text-xl': '1.25rem',
  '--text-2xl': '1.5rem',
  '--text-3xl': '1.875rem',
  '--text-4xl': '2.25rem',
  '--text-5xl': '3rem',
  '--text-6xl': '3.75rem',

  // Font Weights
  '--font-thin': '100',
  '--font-extralight': '200',
  '--font-light': '300',
  '--font-regular': '400',
  '--font-medium': '500',
  '--font-semibold': '600',
  '--font-bold': '700',
  '--font-extrabold': '800',
  '--font-black': '900',

  // Z-Indices
  '--z-base': '0',
  '--z-elevated': '10',
  '--z-header': '40',
  '--z-dropdown': '50',
  '--z-modal': '100',
};

export const themes = {
  default: {
    name: 'Fun fun finance',
    variables: {
      ...baseVariables,
      '--background': '#e0e7ff',
      '--foreground': '#000000',
      '--card-bg': '#ffffff',
      '--card-border': '#000000',
      '--primary': '#a855f7',
      '--primary-hover': '#9333ea',
      '--primary-foreground': '#000000',
      '--secondary': '#fbbf24',
      '--secondary-foreground': '#000000',
      '--accent': '#ec4899',
      '--muted': '#94a3b8',
      '--muted-foreground': '#334155',
      '--success': '#22c55e',
      '--warning': '#f59e0b',
      '--error': '#ef4444',
      '--border-width': '3px',
      '--radius': '8px',
      '--shadow-hard': '5px 5px 0px 0px #000000',
      '--shadow-hover': '7px 7px 0px 0px #000000',
      '--font-heading': 'var(--font-montserrat)',
      '--heading-transform': 'uppercase',
      '--heading-weight': '900',
    }
  },
  doom: {
    name: 'DOOMSDAY',
    variables: {
      ...baseVariables,
      '--background': '#020617', // Slate-950 (Dark Void)
      '--foreground': '#e2e8f0', // Slate-200 (Silver Armor)
      '--card-bg': '#0f172a', // Slate-900 (Dark Metal Plating)
      '--card-border': '#1e293b', // Slate-800 (Panel Lines)
      '--primary': '#10b981', // Emerald-500 (Latverian Cloak Green)
      '--primary-hover': '#059669', // Emerald-600
      '--primary-foreground': '#ffffff',
      '--secondary': '#334155', // Slate-700 (Gunmetal)
      '--secondary-foreground': '#f8fafc',
      '--accent': '#fbbf24', // Amber-400 (Gold Accents/Magic)
      '--muted': '#64748b', // Slate-500
      '--muted-foreground': '#94a3b8', // Slate-400
      '--success': '#10b981',
      '--warning': '#fbbf24',
      '--error': '#ef4444',
      '--border-width': '2px',
      '--radius': '2px', // Sharp, angular, metallic feel
      '--shadow-hard': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)', // Soft dark shadows (Dark Knight style)
      '--shadow-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
      '--font-heading': 'var(--font-montserrat)',
      '--heading-transform': 'uppercase',
      '--heading-weight': '700',
    }
  },
  neighbor: {
    name: 'FRIENDLY NEIGHBOR',
    variables: {
      ...baseVariables,
      '--background': '#FFFFFF',
      '--foreground': '#1A1A1A',
      '--card-bg': '#FFFFFF',
      '--card-border': '#000000',
      '--primary': '#E31B23', // Friendly neighbor red
      '--primary-hover': '#B91419',
      '--primary-foreground': '#FFFFFF',
      '--secondary': '#0D47A1', // Friendly neighbor blue
      '--secondary-foreground': '#FFFFFF',
      '--accent': '#FFD700', // Friendly neighbor gold accent
      '--muted': '#78909C',
      '--muted-foreground': '#546E7A',
      '--success': '#2E7D32',
      '--warning': '#F57C00',
      '--error': '#C62828',
      '--border-width': '3px', // Extra bold borders
      '--radius': '8px',
      '--shadow-hard': '6px 6px 0px 0px #000000', // Comic book shadow
      '--shadow-hover': '8px 8px 0px 0px #000000',
      '--font-heading': 'var(--font-montserrat)',
      '--heading-transform': 'uppercase',
      '--heading-weight': '900', // Extra bold for comic book feel
    }
  },
  vigilante: {
    name: 'DARK KNIGHT',
    variables: {
      ...baseVariables,
      '--background': '#0F1419', // Deep blue-black (like Gotham night sky)
      '--foreground': '#E8E9ED', // Soft white for excellent readability
      '--card-bg': '#1A1F29', // Slightly lighter than background for depth
      '--card-border': '#2D3748', // Subtle gray border (not yellow - too harsh)
      '--primary': '#F7B731', // Warm gold (Batman's utility belt yellow, but softer)
      '--primary-hover': '#F5A623',
      '--primary-foreground': '#0F1419', // Dark text on yellow buttons
      '--secondary': '#4A5568', // Medium gray for secondary elements
      '--secondary-foreground': '#E8E9ED',
      '--accent': '#3B82F6', // Cool blue accent (Batman's cape)
      '--muted': '#718096', // Muted gray for less important text
      '--muted-foreground': '#A0AEC0', // Lighter muted text
      '--success': '#48BB78', // Softer green (not neon)
      '--warning': '#ED8936', // Warm orange warning
      '--error': '#F56565', // Softer red (not harsh)
      '--border-width': '2px',
      '--radius': '6px', // Slightly rounded for modern feel
      '--shadow-hard': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)', // Softer shadow
      '--shadow-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
      '--font-heading': 'var(--font-montserrat)',
      '--heading-transform': 'uppercase',
      '--heading-weight': '700',
    }
  }
} as const;

export type ThemeKey = keyof typeof themes;
