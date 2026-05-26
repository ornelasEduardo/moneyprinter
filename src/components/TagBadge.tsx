import React from 'react';
import { Badge, Tooltip } from 'doom-design-system';
import { Wand } from 'lucide-react';

interface TagBadgeProps {
  tag: string;
  ruleName?: string;
}

export default function TagBadge({ tag, ruleName }: TagBadgeProps) {
  if (!ruleName) {
    return (
      <Badge variant="primary" className="text-xs">
        {tag}
      </Badge>
    );
  }
  return (
    <Tooltip content={`Applied by rule: ${ruleName}`}>
      <Badge
        variant="primary"
        className="text-xs"
        aria-label={`applied by rule: ${ruleName}`}
      >
        <span
          data-testid="tag-rule-indicator"
          style={{ display: 'inline-flex', marginRight: 4 }}
        >
          <Wand size={10} strokeWidth={2.5} />
        </span>
        {tag}
      </Badge>
    </Tooltip>
  );
}
