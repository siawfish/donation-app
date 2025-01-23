import React from 'react';

export const SecureDocument = () => {
  return (
    <div className="relative w-full">
      <svg width="100%" height="100%" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Document background */}
        <rect x="4" y="4" width="40" height="48" rx="4" fill="#FFFFFF"/>
        
        {/* Document lines */}
        <rect x="10" y="14" width="28" height="3" rx="1.5" fill="#CBD5E1"/>
        <rect x="10" y="21" width="22" height="3" rx="1.5" fill="#CBD5E1"/>
        <rect x="10" y="28" width="28" height="3" rx="1.5" fill="#CBD5E1"/>
        
        {/* Shield */}
        <path 
          d="M54 34V46C54 52 44 56 44 56C44 56 34 52 34 46V34L44 31L54 34Z" 
          fill="#35a26d"
        />
        <path 
          d="M38 44L41 47L48 41" 
          stroke="white" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}; 