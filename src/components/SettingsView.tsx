'use client';

import React, { useState, useTransition } from 'react';
import styled from '@emotion/styled';
import { themes, ThemeKey } from '@/lib/themes';
import { setThemePreference } from '@/lib/themes/actions';
import { Text, Card } from '@design-system';
import { useRouter } from 'next/navigation';

const SettingsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
`;

const Section = styled(Card)`
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const ThemeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
`;

const ThemeCard = styled.button<{ isActive: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
  border: var(--border-width) solid ${props => props.isActive ? 'var(--primary)' : 'var(--card-border)'};
  border-radius: var(--radius);
  background: var(--card-bg);
  color: var(--foreground);
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  position: relative;
  overflow: visible;

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-hover);
  }

  ${props => props.isActive && `
    box-shadow: var(--shadow-hard);
    &:after {
      content: 'ACTIVE';
      position: absolute;
      top: calc(-1 * var(--border-width));
      right: calc(-1 * var(--border-width));
      background: var(--primary);
      color: var(--primary-foreground);
      font-size: 0.625rem;
      font-weight: bold;
      padding: 0.25rem 0.5rem;
      border-bottom-left-radius: var(--radius);
      border-top-right-radius: var(--radius);
    }
  `}
`;

const PreviewSwatch = styled.div<{ colors?: string[] }>`
  display: flex;
  height: 24px;
  width: 100%;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--card-border);

  div {
    flex: 1;
    height: 100%;
  }
`;

export default function SettingsView({ currentTheme }: { currentTheme?: ThemeKey }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticTheme, setOptimisticTheme] = useState(currentTheme);

  const handleThemeChange = async (theme: ThemeKey) => {
    setOptimisticTheme(theme);
    
    startTransition(async () => {
      await setThemePreference(theme);
      router.refresh();
    });
  };

  // Fallback to 'default' if the current theme doesn't exist (e.g., after renaming)
  const activeTheme = (optimisticTheme && themes[optimisticTheme]) ? optimisticTheme : 
                      (currentTheme && themes[currentTheme]) ? currentTheme : 
                      'default';

  return (
    <SettingsContainer>
      <Text variant="h2">Settings</Text>

      <Section>
        <div>
          <Text variant="h4" className="mb-2">Appearance</Text>
          <Text color="muted">Choose the visual theme for your Money Printer.</Text>
        </div>

        <ThemeGrid>
          {Object.entries(themes).map(([key, theme]) => (
            <ThemeCard 
              key={key} 
              isActive={activeTheme === key}
              onClick={() => handleThemeChange(key as ThemeKey)}
              disabled={isPending}
            >
              <Text weight="bold" variant="h6">{theme.name}</Text>
              
              <PreviewSwatch>
                <div style={{ background: theme.variables['--background'] }} />
                <div style={{ background: theme.variables['--card-bg'] }} />
                <div style={{ background: theme.variables['--primary'] }} />
                <div style={{ background: theme.variables['--secondary'] }} />
                <div style={{ background: theme.variables['--accent'] }} />
              </PreviewSwatch>

              <Text variant="small" color="muted">
                {key === 'doom' ? 'Authoritative & Regal' : 
                 key === 'neighbor' ? 'Bold & Heroic' : 
                 key === 'vigilante' ? 'Dark & Mysterious' :
                 'Clean & Friendly'}
              </Text>
            </ThemeCard>
          ))}
        </ThemeGrid>
      </Section>
    </SettingsContainer>
  );
}
