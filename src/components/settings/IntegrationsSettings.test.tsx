import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@/test-utils';

vi.mock('@/app/actions/integrations', () => ({
  getPlanningColConfig: vi.fn(async () => ({ mode: 'manual', tier: 'standard', beaEnabled: false, hasBeaKey: false })),
  savePlanningColConfig: vi.fn(async () => {}),
  getIntegrationAudit: vi.fn(async () => []),
}));

import { getPlanningColConfig, savePlanningColConfig, getIntegrationAudit } from '@/app/actions/integrations';
import IntegrationsSettings from './IntegrationsSettings';

describe('IntegrationsSettings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads the current config on mount', async () => {
    render(<IntegrationsSettings />);
    await waitFor(() => expect(getPlanningColConfig).toHaveBeenCalled());
    expect(await screen.findByTestId('col-mode')).toBeInTheDocument();
  });

  it('declares BEA egress (what leaves the machine)', async () => {
    render(<IntegrationsSettings />);
    // egress text is always shown so the user can inspect it before enabling
    expect(await screen.findByTestId('col-egress')).toHaveTextContent(/region/i);
  });

  it('saves the config', async () => {
    render(<IntegrationsSettings />);
    await screen.findByTestId('col-save');
    fireEvent.click(screen.getByTestId('col-save'));
    await waitFor(() => expect(savePlanningColConfig).toHaveBeenCalled());
  });

  it('surfaces a validation error from the action instead of throwing', async () => {
    (savePlanningColConfig as any).mockRejectedValueOnce(new Error('front cap must be <= back cap'));
    render(<IntegrationsSettings />);
    await screen.findByTestId('col-save');
    fireEvent.click(screen.getByTestId('col-save'));
    await waitFor(() => expect(screen.getByTestId('col-error')).toHaveTextContent(/front cap/i));
  });

  it('shows an empty-audit message when nothing has egressed', async () => {
    render(<IntegrationsSettings />);
    expect(await screen.findByTestId('col-audit')).toHaveTextContent(/nothing has left/i);
  });
});
