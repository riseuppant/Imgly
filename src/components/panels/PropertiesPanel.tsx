'use client';

import React from 'react';
import { useEditorStore } from '@/store/editorStore';
import { useExtensionBridge } from '@/hooks/useExtensionBridge';
import { ContainerProps, ImageProps } from './ContainerProps';
import { CSSOutput } from './CSSOutput';
import { ImageIcon, Globe, Loader2, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function PropertiesPanel() {
  const { image, originalContext } = useEditorStore();
  const { previewOnWebsite, previewStatus, hasOriginalContext } = useExtensionBridge();

  return (
    <aside
      className="w-65 shrink-0 flex flex-col bg-[#0d0d0d] border-l border-[#1a1a1a] overflow-y-auto"
      aria-label="Properties panel"
    >
      {/* Panel header */}
      <div className="h-10 flex items-center px-4 border-b border-[#1a1a1a] shrink-0">
        <span className="text-[11px] font-semibold text-[#666] uppercase tracking-widest">
          Properties
        </span>
      </div>

      <div className="flex flex-col gap-5 p-4">
        {/* Webpage Context banner if element was imported from Chrome extension */}
        {hasOriginalContext && originalContext && (
          <div className="p-2.5 rounded-lg bg-[#121217] border border-blue-500/20 text-xs">
            <div className="flex items-center gap-1.5 text-blue-400 font-medium mb-1">
              <Globe className="w-3 h-3" />
              <span>Imported Element</span>
            </div>
            <p className="text-[11px] text-[#888] truncate font-mono mb-1.5" title={originalContext.url || originalContext.sourceOrigin}>
              {originalContext.sourceOrigin || originalContext.url || 'Webpage'}
            </p>
            {originalContext.elementLabel && (
              <p className="text-[10px] text-[#666] font-mono truncate mb-2">
                &lt;{originalContext.elementLabel}&gt;
              </p>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={previewOnWebsite}
              disabled={previewStatus === 'sending'}
              className="w-full text-xs bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white"
            >
              {previewStatus === 'sending' ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : previewStatus === 'success' ? (
                <Check className="w-3 h-3 text-emerald-300" />
              ) : (
                <ExternalLink className="w-3 h-3" />
              )}
              Preview on Website
            </Button>
          </div>
        )}

        {!image ? (
          /* Empty panel state */
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <ImageIcon className="w-6 h-6 text-[#2a2a2a]" />
            <p className="text-xs text-[#444]">
              Import an image to see properties
            </p>
          </div>
        ) : (
          <>
            <ContainerProps />
            <div className="h-px bg-[#1a1a1a]" />
            <ImageProps />
          </>
        )}

        {/* CSS Output — always shown */}
        <div className="h-px bg-[#1a1a1a]" />
        <CSSOutput />
      </div>
    </aside>
  );
}
