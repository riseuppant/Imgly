'use client';

import React from 'react';
import { clsx } from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  unit?: string;
}

export function Input({ label, unit, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-[10px] font-medium uppercase tracking-wider text-[#666]">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <input
          className={clsx(
            'w-full h-7 px-2 text-xs bg-[#141414] border border-[#2a2a2a] rounded text-[#c9c9c9]',
            'focus:outline-none focus:border-blue-600 focus:bg-[#181818]',
            'placeholder:text-[#555] transition-colors duration-150',
            unit && 'pr-6',
            className
          )}
          {...props}
        />
        {unit && (
          <span className="absolute right-2 text-[10px] text-[#555] pointer-events-none">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, options, className, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-[10px] font-medium uppercase tracking-wider text-[#666]">
          {label}
        </label>
      )}
      <select
        className={clsx(
          'w-full h-7 px-2 text-xs bg-[#141414] border border-[#2a2a2a] rounded text-[#c9c9c9]',
          'focus:outline-none focus:border-blue-600',
          'transition-colors duration-150 cursor-pointer',
          className
        )}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  valueDisplay?: string;
}

export function Slider({ label, valueDisplay, className, ...props }: SliderProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-medium uppercase tracking-wider text-[#666]">
            {label}
          </label>
          {valueDisplay && (
            <span className="text-[10px] text-[#888] tabular-nums">{valueDisplay}</span>
          )}
        </div>
      )}
      <input
        type="range"
        className={clsx(
          'w-full h-1 appearance-none bg-[#2a2a2a] rounded-full cursor-pointer',
          '[&::-webkit-slider-thumb]:appearance-none',
          '[&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3',
          '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500',
          '[&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-colors',
          '[&::-webkit-slider-thumb]:hover:bg-blue-400',
          className
        )}
        {...props}
      />
    </div>
  );
}
