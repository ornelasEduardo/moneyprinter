import React from 'react';
import { Logo } from './Logo';
import styles from './BackLink.module.scss';

interface BackLinkProps {
  href?: string;
  size?: number;
  ariaLabel?: string;
}

export default function BackLink({
  href = '/',
  size = 28,
  ariaLabel = 'Back',
}: BackLinkProps) {
  return (
    <a href={href} className={styles.backLink} aria-label={ariaLabel}>
      <Logo size={size} />
    </a>
  );
}
