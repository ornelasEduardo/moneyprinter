import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test-utils';
import { TimeRangePicker } from './TimeRangePicker';

describe('TimeRangePicker', () => {
  it('should render preset options', () => {
    render(<TimeRangePicker onChange={vi.fn()} />);
    expect(screen.getByText(/last 3 months/i)).toBeInTheDocument();
  });

  it('should call onChange with date range on mount', async () => {
    const onChange = vi.fn();
    render(<TimeRangePicker onChange={onChange} />);
    expect(onChange).toHaveBeenCalled();
    const [start, end] = onChange.mock.calls[0];
    expect(start).toBeInstanceOf(Date);
    expect(end).toBeInstanceOf(Date);
  });
});
