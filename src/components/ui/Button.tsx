'use client';

import React from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'primary' | 'danger';
  size?: 'sm' | 'md' | 'icon';
  children: React.ReactNode;
}

export function Button({
  variant = 'default',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-1.5 font-medium transition-all duration-150 select-none outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-40 disabled:cursor-not-allowed',
        {
          // Variants
          'bg-[#1e1e1e] hover:bg-[#2a2a2a] text-[#c9c9c9] border border-[#333] rounded-md':
            variant === 'default',
          'hover:bg-[#1e1e1e] text-[#9a9a9a] hover:text-[#c9c9c9] rounded-md':
            variant === 'ghost',
          'bg-blue-600 hover:bg-blue-500 text-white rounded-md':
            variant === 'primary',
          'bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-900/50 rounded-md':
            variant === 'danger',
          // Sizes
          'h-7 px-2.5 text-xs': size === 'sm',
          'h-8 px-3 text-sm': size === 'md',
          'h-7 w-7 p-0': size === 'icon',
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
