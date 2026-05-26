import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test-utils';
import TagBadge from './TagBadge';

describe('TagBadge', () => {
  it('renders the tag text', () => {
    render(<TagBadge tag="coffee" />);
    expect(screen.getByText('coffee')).toBeInTheDocument();
  });

  it('renders without rule indicator when ruleName is omitted', () => {
    render(<TagBadge tag="coffee" />);
    expect(screen.queryByTestId('tag-rule-indicator')).not.toBeInTheDocument();
  });

  it('renders rule indicator + tooltip text when ruleName provided', () => {
    render(<TagBadge tag="coffee" ruleName="Coffee Shops" />);
    expect(screen.getByTestId('tag-rule-indicator')).toBeInTheDocument();
    expect(screen.getByLabelText(/applied by rule: Coffee Shops/i)).toBeInTheDocument();
  });
});
