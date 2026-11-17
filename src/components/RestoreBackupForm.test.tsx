import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, waitFor } from '@testing-library/react';
import { render, screen } from '@/test-utils';
import RestoreBackupForm from './RestoreBackupForm';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/lib/backup-archive', () => ({ readBackupArchive: vi.fn().mockResolvedValue({ accounts: [{ id: 1 }] }) }));
const upload=vi.fn();
beforeEach(()=>{ upload.mockReset().mockResolvedValue({ok:true,json:async()=>({created:1,skipped:2})}); vi.stubGlobal('fetch',upload); });
afterEach(()=>vi.unstubAllGlobals());
describe('RestoreBackupForm', () => {
  it('confirms copies before uploading the ZIP rather than the expanded Server Action argument', async () => {
    render(<RestoreBackupForm />);
    const file = { name: 'backup.zip', size:100, arrayBuffer: async () => new ArrayBuffer(0) };
    fireEvent.change(screen.getByLabelText('Backup archive'), { target: { files: [file] } });
    await screen.findByText(/1 records ready/i);
    expect(upload).not.toHaveBeenCalled();
    expect(screen.getByText(/creates copies/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Restore copies' }));
    await waitFor(() => expect(upload).toHaveBeenCalledWith('/api/restore',expect.objectContaining({method:'POST',body:file})));
    await screen.findByText(/restored 1 records.*Skipped 2 existing keyed records/i);
  });
  it('explains oversized archive limits before uploading',async()=>{
    render(<RestoreBackupForm />);
    fireEvent.change(screen.getByLabelText('Backup archive'), {target:{files:[{name:'huge.zip',size:21*1024*1024}]}});
    await screen.findByText(/exceeds the 20 MiB upload limit/);
    expect(upload).not.toHaveBeenCalled();
  });
});
