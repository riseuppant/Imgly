'use client';

import React, { useState, useCallback } from 'react';
import { Copy, Check, Code2, FileCode } from 'lucide-react';
import { useEditorStore } from '@/store/editorStore';
import { generateCSS } from '@/lib/cssGenerator';
import { Button } from '@/components/ui/Button';
import { clsx } from 'clsx';

type Tab = 'vanilla' | 'tailwind';

export function CSSOutput() {
  const { container, image } = useEditorStore();
  const [tab, setTab] = useState<Tab>('vanilla');
  const [copied, setCopied] = useState(false);

  const css = generateCSS(container, image);
  const output = tab === 'vanilla' ? css.vanilla : css.tailwind;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [output]);

  return (
    <section aria-label="CSS output">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#555]">
          Output
        </p>
        <div className="flex items-center gap-1">
          <button
            className={clsx(
              'flex items-center gap-1 h-5 px-2 text-[10px] rounded transition-colors',
              tab === 'vanilla'
                ? 'bg-[#1e1e1e] text-[#c0c0c0] border border-[#333]'
                : 'text-[#555] hover:text-[#888]'
            )}
            onClick={() => setTab('vanilla')}
            aria-pressed={tab === 'vanilla'}
          >
            <Code2 className="w-2.5 h-2.5" />
            CSS
          </button>
          <button
            className={clsx(
              'flex items-center gap-1 h-5 px-2 text-[10px] rounded transition-colors',
              tab === 'tailwind'
                ? 'bg-[#1e1e1e] text-[#c0c0c0] border border-[#333]'
                : 'text-[#555] hover:text-[#888]'
            )}
            onClick={() => setTab('tailwind')}
            aria-pressed={tab === 'tailwind'}
          >
            <FileCode className="w-2.5 h-2.5" />
            Tailwind
          </button>
        </div>
      </div>

      <div className="relative group">
        <pre className="text-[11px] leading-relaxed font-mono text-[#8899aa] bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all min-h-30">
          {output}
        </pre>

        <button
          onClick={handleCopy}
          disabled={!image}
          className={clsx(
            'absolute top-2 right-2 h-6 w-6 flex items-center justify-center rounded',
            'transition-all duration-150',
            image
              ? 'opacity-0 group-hover:opacity-100 bg-[#1e1e1e] hover:bg-[#2a2a2a] text-[#888] hover:text-[#c0c0c0] border border-[#333]'
              : 'opacity-0 cursor-not-allowed'
          )}
          aria-label="Copy CSS to clipboard"
          title="Copy"
        >
          {copied ? (
            <Check className="w-3 h-3 text-green-400" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </button>
      </div>

      {image && (
        <Button
          variant="primary"
          size="sm"
          onClick={handleCopy}
          className="w-full mt-2"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" /> Copied!
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" /> Copy {tab === 'vanilla' ? 'CSS' : 'Tailwind'}
            </>
          )}
        </Button>
      )}
    </section>
  );
}
