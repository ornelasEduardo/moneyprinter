import { describe, expect, it, vi } from 'vitest';
import { fireEvent, waitFor } from '@testing-library/react';
import { render, screen } from '@/test-utils';
import RestoreBackupForm from './RestoreBackupForm';
import { restoreBackupAction } from '@/app/actions/restore';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/lib/backup-archive', () => ({ readBackupArchive: vi.fn().mockResolvedValue({ accounts: [{ id: 1 }] }) }));
vi.mock('@/app/actions/restore', () => ({ restoreBackupAction: vi.fn().mockResolvedValue({ created: 1 }) }));

describe('RestoreBackupForm', () => {
  it('requires confirmation before restoring uploaded archive records as copies', async () => {
    render(<RestoreBackupForm />);
    const file = { name: 'backup.zip', arrayBuffer: async () => new ArrayBuffer(0) };
    fireEvent.change(screen.getByLabelText('Backup archive'), { target: { files: [file] } });
    await screen.findByText(/1 records ready/i);
    expect(restoreBackupAction).not.toHaveBeenCalled();
    expect(screen.getByText(/creates copies/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Restore copies' }));
    await waitFor(() => expect(restoreBackupAction).toHaveBeenCalledWith({ accounts: [{ id: 1 }] }));
    await screen.findByText(/restored 1 records/i);
  });
});
