import { render, screen, fireEvent } from '@testing-library/react';
import SettingsView from './SettingsView';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';

// Mock Design System
const mockSetTheme = vi.fn();
vi.mock('doom-design-system', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  Text: ({ children }: any) => <span>{children}</span>,
  useTheme: () => ({
    theme: 'default',
    setTheme: mockSetTheme,
    availableThemes: {
      default: { name: 'Default', variables: {} },
      doom: { name: 'Doom', variables: {} },
      neighbor: { name: 'Neighbor', variables: {} },
    }
  }),
}));

describe('SettingsView', () => {
  it('should render theme options', () => {
    render(<SettingsView />);
    
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Default')).toBeInTheDocument();
    expect(screen.getByText('Doom')).toBeInTheDocument();
    expect(screen.getByText('Neighbor')).toBeInTheDocument();
  });

  it('should change theme', async () => {
    render(<SettingsView />);
    
    const doomTheme = screen.getByText('Doom').closest('button');
    fireEvent.click(doomTheme!);
    
    expect(mockSetTheme).toHaveBeenCalledWith('doom');
  });
});
