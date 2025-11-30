'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Card, Button, Flex } from '@design-system';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children, footer }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  return createPortal(
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-modal flex items-center justify-center p-4 backdrop-blur-sm"
      style={{
        animation: 'fadeIn 0.2s ease-out',
        backgroundColor: 'rgba(0, 0, 0, 0.5)'
      }}
    >
      <div 
        className="w-full max-w-md"
        style={{ 
          animation: 'slideUp 0.3s ease-out'
        }}
      >
        <Card className="p-0 overflow-hidden">
          <Flex 
            justify="space-between" 
            align="center" 
            className="p-6"
            style={{
              borderBottom: 'var(--border-width) solid var(--card-border)',
              background: 'var(--background)'
            }}
          >
            <h3 className="text-xl font-bold m-0">{title}</h3>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X size={20} strokeWidth={2.5} />
            </Button>
          </Flex>
          
          <div className="p-6">
            {children}
          </div>

          {footer && (
            <div 
              className="p-6"
              style={{
                borderTop: 'var(--border-width) solid var(--card-border)',
                background: 'var(--background)'
              }}
            >
              {footer}
            </div>
          )}
        </Card>
      </div>
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>,
    document.body
  );
}
