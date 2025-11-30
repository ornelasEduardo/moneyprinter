import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NetWorthHistoryTable from './NetWorthHistoryTable';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import * as netWorthActions from '@/app/actions/networth';

// Mock server actions
vi.mock('@/app/actions/networth', () => ({
  updateNetWorthEntry: vi.fn(),
  deleteNetWorthEntry: vi.fn(),
  createNetWorthEntry: vi.fn(),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock Design System
vi.mock('@design-system', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled} data-testid="button">
      {children}
    </button>
  ),
  Flex: ({ children }: any) => <div>{children}</div>,
  Input: ({ value, onChange, placeholder, name, defaultValue, label }: any) => (
    <label>
      {label}
      <input 
        value={value} 
        defaultValue={defaultValue}
        onChange={onChange} 
        placeholder={placeholder}
        name={name}
        data-testid={`input-${name || label}`}
      />
    </label>
  ),
  Modal: ({ isOpen, children, title }: any) => (
    isOpen ? <div data-testid="modal"><h2>{title}</h2>{children}</div> : null
  ),
  Table: ({ data, columns }: any) => (
    <div>
      <table>
        <thead>
          <tr>
            {columns.map((col: any) => <th key={col.header}>{col.header}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.map((row: any) => (
            <tr key={row.id} data-testid="table-row">
              <td>{row.date}</td>
              <td>{row.netWorth}</td>
              <td>
                <button onClick={() => columns.find((c: any) => c.id === 'actions').cell({ row: { original: row } })}>
                  Actions
                </button>
                 {columns.find((c: any) => c.id === 'actions').cell({ row: { original: row } })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),
  Text: ({ children }: any) => <span>{children}</span>,
  useToast: () => ({
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
  }),
}));

describe('NetWorthHistoryTable', () => {
  const mockEntries = [
    { id: 1, date: '2024-01-01', netWorth: 10000 },
    { id: 2, date: '2024-02-01', netWorth: 11000 },
  ];

  it('should render entries', () => {
    render(<NetWorthHistoryTable entries={mockEntries} />);
    expect(screen.getByText('Net Worth History')).toBeInTheDocument();
    // Dates are formatted in the table, but our mock Table renders raw data for simplicity in checking existence
    // Wait, our mock Table renders {row.date}.
    // But the real Table uses a cell formatter.
    // In our mock Table, we are rendering `row.date` directly in the `td`.
    // So we expect '2024-01-01'.
    expect(screen.getByText('2024-01-01')).toBeInTheDocument();
  });

  it('should open add modal', () => {
    render(<NetWorthHistoryTable entries={mockEntries} />);
    
    // Find "Add Entry" button. It's the first button (Plus icon + text).
    const addButton = screen.getByText('Add Entry').closest('button');
    fireEvent.click(addButton!);
    
    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByText('Add Net Worth Entry')).toBeInTheDocument();
  });

  it('should delete entry', async () => {
    window.confirm = vi.fn(() => true);
    render(<NetWorthHistoryTable entries={mockEntries} />);
    
    const rows = screen.getAllByTestId('table-row');
    // 0 is debug wrapper, 1 is edit, 2 is delete
    const deleteButton = rows[0].querySelectorAll('button')[2];
    
    fireEvent.click(deleteButton);
    
    await waitFor(() => {
      expect(netWorthActions.deleteNetWorthEntry).toHaveBeenCalledWith(1);
    });
  });
});
