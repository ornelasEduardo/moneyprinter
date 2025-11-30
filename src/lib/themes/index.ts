export const themes = {
  default: {
    name: 'Fun fun finance',
    variables: {
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
      '--background': '#F3F4F6',
      '--foreground': '#111827',
      '--card-bg': '#FFFFFF',
      '--card-border': '#000000',
      '--primary': '#15803D',
      '--primary-hover': '#14532D',
      '--primary-foreground': '#FFFFFF',
      '--secondary': '#475569',
      '--secondary-foreground': '#FFFFFF',
      '--accent': '#B45309',
      '--muted': '#9CA3AF',
      '--muted-foreground': '#4B5563',
      '--success': '#059669',
      '--warning': '#d97706',
      '--error': '#DC2626',
      '--border-width': '3px',
      '--radius': '4px',
      '--shadow-hard': '4px 4px 0px 0px #000000',
      '--shadow-hover': '6px 6px 0px 0px #000000',
      '--font-heading': 'var(--font-oswald)',
      '--heading-transform': 'uppercase',
      '--heading-weight': '700',
    }
  },
  neighbor: {
    name: 'FRIENDLY NEIGHBOR',
    variables: {
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
      '--font-heading': 'var(--font-oswald)',
      '--heading-transform': 'uppercase',
      '--heading-weight': '700',
    }
  }
} as const;

export type ThemeKey = keyof typeof themes;
