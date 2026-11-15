import React from 'react';

/**
 * Healthy Family Icon
 * Represents parents, elder, and loved one standing united in care.
 */
export default function FamilyLogo({ className = "w-10 h-10" }) {
  return (
    <svg 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Soft circular background */}
      <circle cx="24" cy="24" r="23" className="fill-blue-600/10" />

      {/* Adult Figure Left */}
      <circle cx="14" cy="16" r="4.5" fill="currentColor" />
      <path 
        d="M6.5 36c0-5 3.5-9 7.5-9s7.5 4 7.5 9" 
        stroke="currentColor" 
        strokeWidth="3" 
        strokeLinecap="round" 
      />

      {/* Adult Figure Right */}
      <circle cx="34" cy="16" r="4.5" fill="currentColor" />
      <path 
        d="M26.5 36c0-5 3.5-9 7.5-9s7.5 4 7.5 9" 
        stroke="currentColor" 
        strokeWidth="3" 
        strokeLinecap="round" 
      />

      {/* Center Figure */}
      <circle cx="24" cy="19" r="4" fill="currentColor" />
      <path 
        d="M17.5 37c0-4 2.9-7 6.5-7s6.5 3 6.5 7" 
        stroke="currentColor" 
        strokeWidth="3" 
        strokeLinecap="round" 
      />

      {/* Connected supporting base curve */}
      <path
        d="M10 36 C16 40 32 40 38 36"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
