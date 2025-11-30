import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

export const Logo = ({ size = 48, className }: LogoProps) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* 
        Space Digital Kaiju (Restored)
        The user liked this one best ("It looks really good!").
        It's a classic 8-bit invader shape with transparent eyes.
        
        - 16x16 Eyes (Goldilocks size)
        - Thick 6px stroke for Neubrutalist feel
        - CurrentColor for theme adaptability
      */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M 25 25 
           L 25 15 L 35 15 L 35 25 
           L 65 25 L 65 15 L 75 15 L 75 25 
           L 85 25 L 85 55 
           L 95 55 L 95 75 L 85 75 L 85 85 
           L 65 85 L 65 75 L 35 75 L 35 85 
           L 15 85 L 15 75 L 5 75 L 5 55 
           L 15 55 L 15 25 
           Z
           
           M 32 37 L 48 37 L 48 53 L 32 53 Z
           M 52 37 L 68 37 L 68 53 L 52 53 Z"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinejoin="round"
      />
    </svg>
  );
};
