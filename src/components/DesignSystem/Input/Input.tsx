'use client';

import React, { useState } from 'react';
import styled from '@emotion/styled';
import {  Text  } from '@design-system';

const InputContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
`;

const StyledInput = styled.input<{ hasStartAdornment?: boolean; hasEndAdornment?: boolean; isError?: boolean }>`
  width: 100%;
  padding: 0.75rem 1rem;
  padding-left: ${props => props.hasStartAdornment ? '2rem' : '1rem'};
  padding-right: ${props => props.hasEndAdornment ? '2rem' : '1rem'};
  font-size: var(--text-base);
  background: var(--card-bg);
  color: var(--foreground);
  border: var(--border-width) solid ${props => props.isError ? 'var(--error)' : 'var(--card-border)'};
  border-radius: var(--radius);
  box-shadow: var(--shadow-hard);
  outline: none;
  transition: all 0.1s ease;

  &:focus {
    box-shadow: var(--shadow-hover);
    transform: translate(-2px, -2px);
    border-color: ${props => props.isError ? 'var(--error)' : 'var(--primary)'};
  }

  &::placeholder {
    color: var(--muted);
  }
`;

const Adornment = styled.span<{ position: 'start' | 'end' }>`
  position: absolute;
  ${props => props.position === 'start' ? 'left: 0.75rem;' : 'right: 0.75rem;'}
  color: var(--muted-foreground);
  font-size: 0.875rem;
  pointer-events: none;
  z-index: 1;
`;

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
  format?: (value: string | number | readonly string[] | undefined) => string;
  validate?: (value: string | number | readonly string[] | undefined) => string | undefined;
}

export function Input({ 
  label, 
  error: errorProp, 
  helperText, 
  startAdornment, 
  endAdornment, 
  style, 
  className, 
  format,
  validate,
  onBlur,
  onFocus,
  value,
  ...props 
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [internalError, setInternalError] = useState<string | undefined>(undefined);

  const error = errorProp || internalError;

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    if (validate) {
      setInternalError(validate(e.target.value));
    }
    if (onBlur) onBlur(e);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  // Use formatted value when not focused, otherwise raw value
  const displayValue = (!isFocused && format && value !== undefined) 
    ? format(value) 
    : value;

  return (
    <InputContainer style={style} className={className}>
      {label && (
        <Text as="label" variant="small" weight="bold" color="muted" className="mb-1 block">
          {label}
        </Text>
      )}
      
      <InputWrapper>
        {startAdornment && <Adornment position="start">{startAdornment}</Adornment>}
        <StyledInput 
          {...props} 
          value={displayValue}
          hasStartAdornment={!!startAdornment}
          hasEndAdornment={!!endAdornment}
          isError={!!error}
          onBlur={handleBlur}
          onFocus={handleFocus}
        />
        {endAdornment && <Adornment position="end">{endAdornment}</Adornment>}
      </InputWrapper>

      {error && (
        <Text variant="caption" color="error" className="mt-1">
          {error}
        </Text>
      )}
      {!error && helperText && (
        <Text variant="caption" color="muted" className="mt-1">
          {helperText}
        </Text>
      )}
    </InputContainer>
  );
}
