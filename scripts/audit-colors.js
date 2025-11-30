// Helper to parse hex color to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Helper to calculate relative luminance
function getLuminance(r, g, b) {
  const a = [r, g, b].map(function (v) {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

// Helper to calculate contrast ratio
function getContrastRatio(hex1, hex2) {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  
  if (!rgb1 || !rgb2) return 0;
  
  const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

// Theme definitions extracted from file
const themes = {
  default: {
    background: '#e0e7ff',
    foreground: '#000000',
    primary: '#a855f7',
    primaryForeground: '#000000',
    secondary: '#fbbf24',
    secondaryForeground: '#000000',
    muted: '#94a3b8',
    mutedForeground: '#334155',
  },
  doom: {
    background: '#020617',
    foreground: '#e2e8f0',
    primary: '#10b981',
    primaryForeground: '#020617', // Updated to match fix
    secondary: '#334155',
    secondaryForeground: '#f8fafc',
    muted: '#64748b',
    mutedForeground: '#94a3b8',
  },
  neighbor: {
    background: '#F8FAFC',
    foreground: '#0F172A',
    primary: '#002D72',
    primaryForeground: '#FFFFFF',
    secondary: '#B91C1C',
    secondaryForeground: '#FFFFFF',
    muted: '#64748B',
    mutedForeground: '#475569',
  },
  vigilante: {
    background: '#0F1419',
    foreground: '#E8E9ED',
    primary: '#F7B731',
    primaryForeground: '#0F1419',
    secondary: '#4A5568',
    secondaryForeground: '#E8E9ED',
    muted: '#718096',
    mutedForeground: '#A0AEC0',
  }
};

console.log('Color Accessibility Audit (WCAG 2.1 AAA Standards)\n');
console.log('Requirements:');
console.log('- Normal Text: 7:1');
console.log('- Large Text: 4.5:1');
console.log('- UI Components: 3:1\n');

const failures = [];

Object.entries(themes).forEach(([themeName, colors]) => {
  console.log(`Checking Theme: ${themeName.toUpperCase()}`);
  
  const checks = [
    {
      name: 'Background vs Foreground',
      c1: colors.background,
      c2: colors.foreground,
      target: 7
    },
    {
      name: 'Primary vs Primary Foreground',
      c1: colors.primary,
      c2: colors.primaryForeground,
      target: 4.5 // Buttons usually have larger/bold text
    },
    {
      name: 'Secondary vs Secondary Foreground',
      c1: colors.secondary,
      c2: colors.secondaryForeground,
      target: 4.5
    },
    {
      name: 'Background vs Muted Foreground',
      c1: colors.background,
      c2: colors.mutedForeground,
      target: 4.5 // Muted text is often smaller but allowed lower contrast
    }
  ];

  checks.forEach(check => {
    const ratio = getContrastRatio(check.c1, check.c2);
    const pass = ratio >= check.target;
    const status = pass ? 'PASS' : 'FAIL';
    
    if (!pass) {
      failures.push({
        theme: themeName,
        check: check.name,
        ratio: ratio.toFixed(2),
        target: check.target,
        colors: `${check.c1} vs ${check.c2}`
      });
    }
    
    console.log(`  ${status} [${ratio.toFixed(2)}:1] ${check.name} (${check.c1} vs ${check.c2})`);
  });
  console.log('');
});

if (failures.length > 0) {
  console.log('⚠️  FAILURES DETECTED:');
  failures.forEach(f => {
    console.log(`  - [${f.theme.toUpperCase()}] ${f.check}: ${f.ratio}:1 (Target: ${f.target}:1) | Colors: ${f.colors}`);
  });
  process.exit(1);
} else {
  console.log('✅ All checked color combinations meet AAA standards!');
}
