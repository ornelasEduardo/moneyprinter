import { render, screen } from '@/test-utils';
import SettingsPage from './page';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';

// Mock Design System hooks locally to avoid Provider issues
// Mock SettingsView
vi.mock('@/components/SettingsView', () => ({
  default: () => <div data-testid="settings-view">Settings Content</div>,
}));

describe('SettingsPage', () => {
  it('should render settings view', () => {
    render(<SettingsPage />);
    expect(screen.getByTestId('settings-view')).toBeInTheDocument();
  });
});
