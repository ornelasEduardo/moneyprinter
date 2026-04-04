import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test-utils';
import ImportSpreadsheet from './ImportSpreadsheet';

vi.mock('ag-grid-react', () => ({
  AgGridReact: (props: any) => (
    <div data-testid="ag-grid" data-row-count={props.rowData?.length ?? 0}>
      AG Grid Mock
    </div>
  ),
}));

vi.mock('ag-grid-community', () => ({
  AllCommunityModule: {},
  ModuleRegistry: { registerModules: vi.fn() },
}));

vi.mock('papaparse', () => ({
  default: { parse: vi.fn() },
}));

vi.mock('@/app/actions/import-config', () => ({
  getImportConfigurations: vi.fn().mockResolvedValue([]),
  createImportConfiguration: vi.fn(),
}));

vi.mock('@/app/actions/import', () => ({
  commitImportAction: vi.fn(),
}));

vi.mock('@/app/actions/import-history', () => ({
  recordImportHistory: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const mockParsedData = [
  { 'Date': '2026-03-15', 'Description': 'Coffee', 'Amount': '4.50' },
  { 'Date': '2026-03-16', 'Description': 'Lunch', 'Amount': '12.00' },
];

describe('ImportSpreadsheet', () => {
  it('should render upload prompt when no data', () => {
    render(<ImportSpreadsheet />);
    expect(screen.getByText(/import bank transactions/i)).toBeInTheDocument();
  });

  it('should render grid when data is provided', () => {
    render(<ImportSpreadsheet initialData={mockParsedData} filename="test.csv" />);
    expect(screen.getByTestId('ag-grid')).toBeInTheDocument();
  });

  it('should show summary counts', () => {
    render(<ImportSpreadsheet initialData={mockParsedData} filename="test.csv" />);
    expect(screen.getByText(/2\s+valid/)).toBeInTheDocument();
  });
});
