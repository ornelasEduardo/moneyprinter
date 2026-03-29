import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test-utils';
import DataTab from './DataTab';

vi.mock('@/lib/constants', async () => {
  const actual = await vi.importActual('@/lib/constants');
  return {
    ...actual,
    EXPORTABLE_ENTITIES: ['accounts', 'transactions'],
  };
});

vi.mock('@/app/actions/import', () => ({
  validateImport: vi.fn(),
  commitImportAction: vi.fn(),
}));

vi.mock('@/app/actions/backup', () => ({
  getBackupEstimate: vi.fn().mockResolvedValue({
    totalRows: 100,
    estimatedBytes: 50000,
    entities: { accounts: 10, transactions: 90 },
  }),
  recordBackup: vi.fn(),
  dismissBackupReminder: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe('DataTab', () => {
  it('should render export section', () => {
    render(<DataTab backupHistory={[]} showBackupReminder={false} />);
    expect(screen.getByText(/export/i)).toBeInTheDocument();
  });

  it('should render import section', () => {
    render(<DataTab backupHistory={[]} showBackupReminder={false} />);
    expect(screen.getByText(/import/i)).toBeInTheDocument();
  });

  it('should render backup section', () => {
    render(<DataTab backupHistory={[]} showBackupReminder={false} />);
    expect(screen.getByText(/backup/i)).toBeInTheDocument();
  });

  it('should show backup reminder when prop is true', () => {
    render(<DataTab backupHistory={[]} showBackupReminder={true} />);
    expect(screen.getByText(/since your last backup/i)).toBeInTheDocument();
  });
});
