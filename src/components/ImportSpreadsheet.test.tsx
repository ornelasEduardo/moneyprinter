import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test-utils';
import ImportSpreadsheet from './ImportSpreadsheet';
import { getImportConfigurations } from '@/app/actions/import-config';

vi.mock('ag-grid-react', () => ({
  AgGridReact: (props: any) => (
    <div data-testid="ag-grid" data-row-count={props.rowData?.length ?? 0}>
      AG Grid Mock
      {props.rowData?.map((_: unknown, index: number) => {
        const typeColumn = props.columnDefs?.find((c: { colId?: string }) => c.colId === '__purpose');
        const amountColumn = props.columnDefs?.find((c: { colId?: string }) => c.colId === '__normalizedAmount');
        return typeColumn ? <div key={index}>
          <select aria-label={`Classification ${index}`} value={typeColumn.valueGetter({ node: { rowIndex: props.rowData.length - index - 1 }, data: props.rowData[index] })} onChange={(event) => typeColumn.valueSetter({ node: { rowIndex: props.rowData.length - index - 1 }, data: props.rowData[index], newValue: event.target.value })}>
            {typeColumn.cellEditorParams.values.map((value: string) => <option key={value} value={value}>{value}</option>)}
          </select>
          <span data-testid={`normalized-amount-${index}`}>{amountColumn?.valueGetter({ node: { rowIndex: props.rowData.length - index - 1 }, data: props.rowData[index] })}</span>
        </div> : null;
      })}
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
    expect(screen.getByText(/import transactions/i)).toBeInTheDocument();
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


it('offers per-statement sign convention and default purpose', () => {
  render(<ImportSpreadsheet initialData={mockParsedData} filename="test.csv" />);
  expect(screen.getByRole('combobox', { name: 'Amount convention' })).toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: 'Default transaction type' })).toBeInTheDocument();
});


it('classifies individual rows and previews normalized refund magnitudes', async () => {
  render(<ImportSpreadsheet initialData={[{ Date: '2026-03-15', Description: 'Return', Amount: '-30' }]} filename="refund.csv" />);
  const select = screen.getByRole('combobox', { name: 'Classification 0' });
  fireEvent.change(select, { target: { value: 'refund' } });
  await waitFor(() => expect(select).toHaveValue('refund'));
  expect(screen.getByTestId('normalized-amount-0')).toHaveTextContent('30');
});


it('restores statement purpose and sign convention from a saved config', async () => {
  vi.mocked(getImportConfigurations).mockResolvedValue([{
    id: 9, name: 'Card credits',
    column_mapping: { Date: { field: 'date', type: 'date' }, Description: { field: 'name', type: 'string' }, Amount: { field: 'amount', type: 'currency' } },
    behaviors: { amount_convention: 'positive_is_debit', default_type: 'refund' },
  }] as never);
  render(<ImportSpreadsheet initialData={mockParsedData} filename="test.csv" />);
  fireEvent.click(screen.getByRole('button', { name: 'Configs' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Apply' }));
  await waitFor(() => expect(screen.getByRole('combobox', { name: 'Classification 0' })).toHaveValue('refund'));
});


it('keeps classification attached to its source row after grid sorting', async () => {
  render(<ImportSpreadsheet initialData={[
    { Date: '2026-03-15', Description: 'Return', Amount: '-30' },
    { Date: '2026-03-16', Description: 'Purchase', Amount: '90' },
  ]} filename="mixed.csv" />);
  fireEvent.change(screen.getByRole('combobox', { name: 'Classification 0' }), { target: { value: 'refund' } });
  await waitFor(() => expect(screen.getByTestId('normalized-amount-0')).toHaveTextContent('30'));
  expect(screen.getByRole('combobox', { name: 'Classification 1' })).toHaveValue('income');
});
