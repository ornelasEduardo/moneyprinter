import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SettingsView from './SettingsView';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import * as themeActions from '@/lib/themes/actions';

// Mock server actions
vi.mock('@/lib/themes/actions', () => ({
  setThemePreference: vi.fn(),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

// Mock Design System
vi.mock('@design-system', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  Text: ({ children }: any) => <span>{children}</span>,
}));

// Mock themes
vi.mock('@/lib/themes', () => ({
  themes: {
    default: { name: 'Default', variables: {} },
    doom: { name: 'Doom', variables: {} },
    neighbor: { name: 'Neighbor', variables: {} },
  },
}));

describe('SettingsView', () => {
  it('should render theme options', () => {
    render(<SettingsView currentTheme="default" />);
    
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Default')).toBeInTheDocument();
    expect(screen.getByText('Doom')).toBeInTheDocument();
    expect(screen.getByText('Neighbor')).toBeInTheDocument();
  });

  it('should change theme', async () => {
    render(<SettingsView currentTheme="default" />);
    
    const doomTheme = screen.getByText('Doom').closest('button');
    fireEvent.click(doomTheme!);
    
    await waitFor(() => {
      expect(themeActions.setThemePreference).toHaveBeenCalledWith('doom');
    });
  });
});
