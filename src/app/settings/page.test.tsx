import { render, screen } from '@testing-library/react';
import SettingsPage from './page';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';

// Mock SettingsViewWrapper
vi.mock('@/components/SettingsViewWrapper', () => ({
  default: () => <div data-testid="settings-wrapper">Settings Content</div>,
}));

describe('SettingsPage', () => {
  it('should render settings wrapper', () => {
    render(<SettingsPage />);
    expect(screen.getByTestId('settings-wrapper')).toBeInTheDocument();
  });
});
