'use client';

import React from 'react';
import { useEditorStore } from '@/store/editorStore';
import { Input, Select, Slider } from '@/components/ui/Input';
import type { ObjectFit } from '@/lib/types';

const FIT_OPTIONS: { value: ObjectFit; label: string }[] = [
  { value: 'cover', label: 'cover' },
  { value: 'contain', label: 'contain' },
  { value: 'fill', label: 'fill' },
  { value: 'none', label: 'none' },
  { value: 'scale-down', label: 'scale-down' },
];

export function ContainerProps() {
  const { container, setContainer, commitContainer } = useEditorStore();

  const handleNumber = (key: keyof typeof container, raw: string) => {
    const val = parseFloat(raw);
    if (!isNaN(val)) {
      setContainer({ [key]: Math.max(0, val) });
      commitContainer();
    }
  };

  return (
    <section aria-label="Container properties">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#555] mb-3">
        Container
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Input
          label="Width"
          unit="px"
          type="number"
          min={80}
          value={Math.round(container.width)}
          onChange={(e) => handleNumber('width', e.target.value)}
        />
        <Input
          label="Height"
          unit="px"
          type="number"
          min={60}
          value={Math.round(container.height)}
          onChange={(e) => handleNumber('height', e.target.value)}
        />
      </div>
      <div className="mt-2">
        <Slider
          label="Border Radius"
          valueDisplay={`${container.borderRadius}px`}
          min={0}
          max={200}
          step={1}
          value={container.borderRadius}
          onChange={(e) => {
            setContainer({ borderRadius: parseInt(e.target.value) });
          }}
          onMouseUp={commitContainer}
        />
      </div>
      <div className="mt-2">
        <label className="text-[10px] font-medium uppercase tracking-wider text-[#666] block mb-1">
          Background
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={
              container.backgroundColor === 'transparent'
                ? '#000000'
                : container.backgroundColor
            }
            onChange={(e) => setContainer({ backgroundColor: e.target.value })}
            onBlur={commitContainer}
            className="w-7 h-7 rounded border border-[#2a2a2a] bg-transparent cursor-pointer p-0.5"
            aria-label="Background color"
          />
          <Input
            value={container.backgroundColor}
            onChange={(e) => setContainer({ backgroundColor: e.target.value })}
            onBlur={commitContainer}
            placeholder="transparent"
            className="flex-1"
          />
        </div>
      </div>
    </section>
  );
}

export function ImageProps() {
  const {
    image,
    editMode,
    setEditMode,
    setImageProps,
    commitImageProps,
    resetPosition,
    importedPosition,
  } = useEditorStore();

  if (!image) return null;

  return (
    <section aria-label="Image properties">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#555]">
          Image & Crop
        </p>
        <button
          onClick={() => setEditMode(editMode === 'crop' ? 'select' : 'crop')}
          className={`text-[10px] font-medium px-2 py-0.5 rounded transition-colors cursor-pointer ${
            editMode === 'crop'
              ? 'bg-blue-600 text-white'
              : 'bg-[#1a1a1a] text-[#888] hover:text-[#ccc] border border-[#2a2a2a]'
          }`}
        >
          {editMode === 'crop' ? 'Done Cropping' : 'Crop Mode'}
        </button>
      </div>

      <Select
        label="Object Fit"
        value={image.objectFit}
        options={FIT_OPTIONS}
        onChange={(e) => {
          setImageProps({ objectFit: e.target.value as ObjectFit });
          commitImageProps();
        }}
      />

      <div className="mt-3 space-y-2">
        <Slider
          label="Position X"
          valueDisplay={`${Math.round(image.positionX)}%`}
          min={0}
          max={100}
          step={1}
          value={image.positionX}
          onChange={(e) =>
            setImageProps({ positionX: parseInt(e.target.value) })
          }
          onMouseUp={commitImageProps}
        />
        <Slider
          label="Position Y"
          valueDisplay={`${Math.round(image.positionY)}%`}
          min={0}
          max={100}
          step={1}
          value={image.positionY}
          onChange={(e) =>
            setImageProps({ positionY: parseInt(e.target.value) })
          }
          onMouseUp={commitImageProps}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Input
          label="X (%)"
          type="number"
          min={0}
          max={100}
          value={Math.round(image.positionX)}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) setImageProps({ positionX: Math.max(0, Math.min(100, v)) });
          }}
          onBlur={commitImageProps}
          unit="%"
        />
        <Input
          label="Y (%)"
          type="number"
          min={0}
          max={100}
          value={Math.round(image.positionY)}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) setImageProps({ positionY: Math.max(0, Math.min(100, v)) });
          }}
          onBlur={commitImageProps}
          unit="%"
        />
      </div>

      {/* Reset position button */}
      <button
        onClick={resetPosition}
        className="w-full mt-3 py-1 text-[11px] font-medium text-[#888] hover:text-[#e0e0e0] bg-[#141414] hover:bg-[#1f1f1f] border border-[#222] rounded transition-colors cursor-pointer"
        title={
          importedPosition
            ? `Reset to imported state (${importedPosition.positionX}% ${importedPosition.positionY}%)`
            : 'Reset to center (50% 50%)'
        }
      >
        Reset Position {importedPosition ? `(to ${importedPosition.positionX}% ${importedPosition.positionY}%)` : '(to 50% 50%)'}
      </button>

      {/* Natural dimensions info */}
      <div className="mt-3 p-2 rounded bg-[#111] border border-[#1e1e1e]">
        <p className="text-[10px] text-[#444] font-mono">
          Natural: {image.naturalWidth} × {image.naturalHeight}px
        </p>
      </div>
    </section>
  );
}
