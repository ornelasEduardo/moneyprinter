'use client';

import { useState, useEffect, useCallback } from 'react';
import { Flex, Select, Input } from 'doom-design-system';

type Preset = 'this-month' | 'last-3' | 'last-6' | 'ytd' | 'custom';

const PRESETS: { value: Preset; label: string }[] = [
  { value: 'this-month', label: 'This month' },
  { value: 'last-3', label: 'Last 3 months' },
  { value: 'last-6', label: 'Last 6 months' },
  { value: 'ytd', label: 'Year to date' },
  { value: 'custom', label: 'Custom range' },
];

function presetToRange(preset: Preset): [Date, Date] {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  switch (preset) {
    case 'this-month':
      return [new Date(now.getFullYear(), now.getMonth(), 1), end];
    case 'last-3': {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 3);
      start.setDate(1);
      return [start, end];
    }
    case 'last-6': {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 6);
      start.setDate(1);
      return [start, end];
    }
    case 'ytd':
      return [new Date(now.getFullYear(), 0, 1), end];
    case 'custom':
      return [new Date(now.getFullYear(), 0, 1), end];
  }
}

interface TimeRangePickerProps {
  onChange: (start: Date, end: Date) => void;
  defaultPreset?: Preset;
}

export function TimeRangePicker({ onChange, defaultPreset = 'last-3' }: TimeRangePickerProps) {
  const [preset, setPreset] = useState<Preset>(defaultPreset);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const emitRange = useCallback((p: Preset) => {
    if (p === 'custom' && customStart && customEnd) {
      onChange(new Date(customStart), new Date(customEnd));
    } else if (p !== 'custom') {
      const [start, end] = presetToRange(p);
      onChange(start, end);
    }
  }, [onChange, customStart, customEnd]);

  useEffect(() => {
    emitRange(preset);
  }, [preset]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Flex align="center" gap={3}>
      <Select
        size="sm"
        value={preset}
        onChange={(e) => {
          const p = e.target.value as Preset;
          setPreset(p);
          emitRange(p);
        }}
        options={PRESETS}
      />
      {preset === 'custom' && (
        <Flex align="center" gap={2}>
          <Input
            type="date"
            value={customStart}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setCustomStart(e.target.value);
              if (e.target.value && customEnd) {
                onChange(new Date(e.target.value), new Date(customEnd));
              }
            }}
          />
          <Input
            type="date"
            value={customEnd}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setCustomEnd(e.target.value);
              if (customStart && e.target.value) {
                onChange(new Date(customStart), new Date(e.target.value));
              }
            }}
          />
        </Flex>
      )}
    </Flex>
  );
}
