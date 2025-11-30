'use client';

import React, { useState, useRef, useEffect, KeyboardEvent, useId } from 'react';
import styled from '@emotion/styled';
import { Text, Popover } from '@design-system';
import { Check, ChevronDown } from 'lucide-react';

const SelectContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
`;

const SelectTrigger = styled.button`
  width: 100%;
  background: var(--card-bg);
  border: var(--border-width) solid var(--card-border);
  color: var(--foreground);
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  cursor: pointer;
  box-shadow: var(--shadow-hard);
  border-radius: var(--radius);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: all 0.1s ease;
  min-height: 42px;

  &:hover {
    transform: translate(-2px, -2px);
    box-shadow: var(--shadow-hover);
  }

  &:focus {
    outline: none;
    transform: translate(-2px, -2px);
    box-shadow: var(--shadow-hover);
    border-color: var(--primary);
  }

  &[aria-expanded="true"] {
    transform: translate(-2px, -2px);
    box-shadow: var(--shadow-hover);
    border-color: var(--primary);
  }
`;

const OptionsList = styled.ul`
  background: var(--card-bg);
  border: var(--border-width) solid var(--primary);
  border-radius: var(--radius);
  box-shadow: var(--shadow-hover);
  min-width: 200px;
  max-height: 300px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.25rem;
  margin: 0;
  list-style: none;
`;

const OptionItem = styled.li<{ isSelected?: boolean; isHighlighted?: boolean }>`
  text-align: left;
  padding: 0.75rem 1rem;
  background: ${props => props.isSelected ? 'var(--primary)' : (props.isHighlighted ? 'color-mix(in srgb, var(--primary), transparent 85%)' : 'transparent')};
  border: none;
  border-radius: calc(var(--radius) - 2px);
  color: ${props => props.isSelected ? 'var(--primary-foreground)' : (props.isHighlighted ? 'var(--primary)' : 'var(--foreground)')};
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: ${props => props.isSelected ? '700' : '400'};
  transition: all 0.1s ease;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  user-select: none;

  &:hover {
    background-color: color-mix(in srgb, var(--primary), transparent 85%);
    color: var(--primary);
  }
  
  ${props => props.isSelected && `
    &:hover {
      background-color: var(--primary);
      color: var(--primary-foreground);
      filter: brightness(1.1);
    }
  `}
`;

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  options: { value: string | number; label: string }[];
  label?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  placeholder?: string;
}

export function Select({ options, className, label, style, value, defaultValue, onChange, placeholder, id, ...props }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(defaultValue || '');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const reactId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxId = id ? `${id}-listbox` : `select-listbox-${reactId}`;
  const labelId = id ? `${id}-label` : `select-label-${reactId}`;

  const currentValue = value !== undefined ? value : internalValue;
  const selectedOption = options.find(opt => String(opt.value) === String(currentValue));

  // Reset highlighted index when opening
  useEffect(() => {
    if (isOpen) {
      const index = options.findIndex(opt => String(opt.value) === String(currentValue));
      setHighlightedIndex(index >= 0 ? index : 0);
    }
  }, [isOpen, currentValue, options]);

  const handleSelect = (newValue: string | number) => {
    if (value === undefined) {
      setInternalValue(newValue);
    }
    
    if (onChange) {
      const syntheticEvent = {
        target: { value: newValue, name: props.name },
        currentTarget: { value: newValue, name: props.name },
        preventDefault: () => {},
        stopPropagation: () => {},
      } as unknown as React.ChangeEvent<HTMLSelectElement>;
      
      onChange(syntheticEvent);
    }
    
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen) {
          if (highlightedIndex >= 0 && highlightedIndex < options.length) {
            handleSelect(options[highlightedIndex].value);
          }
        } else {
          setIsOpen(true);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex(prev => (prev < options.length - 1 ? prev + 1 : 0));
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex(prev => (prev > 0 ? prev - 1 : options.length - 1));
        }
        break;
      case 'Escape':
        if (isOpen) {
          e.preventDefault();
          setIsOpen(false);
          triggerRef.current?.focus();
        }
        break;
      case 'Tab':
        if (isOpen) {
          setIsOpen(false);
        }
        break;
    }
  };

  return (
    <SelectContainer className={className} style={style}>
      {label && (
        <Text 
          as="label" 
          id={labelId}
          variant="small" 
          weight="bold" 
          color="muted" 
          className="mb-1 block"
          htmlFor={id}
        >
          {label}
        </Text>
      )}
      <Popover
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        placement="bottom-start"
        trigger={
          <SelectTrigger 
            ref={triggerRef}
            type="button" 
            id={id}
            onClick={() => setIsOpen(!isOpen)}
            onKeyDown={handleKeyDown}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-controls={listboxId}
            aria-labelledby={label ? labelId : undefined}
            {...props as any}
          >
            <span>{selectedOption ? selectedOption.label : (placeholder || 'Select...')}</span>
            <ChevronDown size={16} strokeWidth={2.5} style={{ marginLeft: '0.5rem' }} />
          </SelectTrigger>
        }
        content={
          <OptionsList 
            id={listboxId} 
            role="listbox" 
            aria-labelledby={label ? labelId : undefined}
            style={{ width: triggerRef.current?.offsetWidth }}
          >
            {options.map((opt, index) => {
              const isSelected = String(opt.value) === String(currentValue);
              const isHighlighted = index === highlightedIndex;
              
              return (
                <OptionItem
                  key={opt.value}
                  id={`${listboxId}-option-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  isSelected={isSelected}
                  isHighlighted={isHighlighted}
                  onClick={() => handleSelect(opt.value)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check size={14} strokeWidth={3} />}
                </OptionItem>
              );
            })}
          </OptionsList>
        }
      />
      <input 
        type="hidden" 
        name={props.name} 
        value={currentValue} 
      />
    </SelectContainer>
  );
}
