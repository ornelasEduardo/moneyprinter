import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import JSZip from 'jszip';
import { GET } from './route';

vi.mock('@/lib/auth', () => ({ getCurrentUser: vi.fn().mockResolvedValue(42) }));
vi.mock('@/lib/export', async (original) => ({
  ...await original<typeof import('@/lib/export')>(),
  exportAllEntities: vi.fn().mockResolvedValue({ transactions: [{ id: 7, type: 'refund', original_transaction_id: 6 }], categorization_rules: [{ id: 9, actions: { setType: 'refund', addTags: ['clothing'] } }] }),
}));

describe('backup archive format', () => {
  it('includes lossless JSON for relationship IDs and structured rule values', async () => {
    const response = await GET(new NextRequest('http://localhost/api/export?format=zip&type=backup'));
    const zip = await JSZip.loadAsync(await response.arrayBuffer());
    expect(zip.file('transactions.json')).not.toBeNull();
    expect(JSON.parse(await zip.file('transactions.json')!.async('string'))[0].original_transaction_id).toBe(6);
    expect(JSON.parse(await zip.file('categorization_rules.json')!.async('string'))[0].actions.setType).toBe('refund');
    expect(JSON.parse(await zip.file('metadata.json')!.async('string')).type).toBe('backup');
  });
});
