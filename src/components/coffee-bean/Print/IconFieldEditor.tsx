'use client';

import React from 'react';
import { ImageIcon, Minus, Plus, RotateCcw, Upload, X } from 'lucide-react';
import { IMAGE_FILE_ACCEPT } from '@/lib/images/imageFormat';

const SOFT_BUTTON_CLASS =
  'rounded bg-neutral-200/50 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700';

interface IconFieldEditorProps {
  icon: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  isProcessing: boolean;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onUploadClick: () => void;
  onRemove: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetPlacement: () => void;
}

export const IconFieldEditor: React.FC<IconFieldEditorProps> = ({
  icon,
  inputRef,
  isProcessing,
  onFileChange,
  onUploadClick,
  onRemove,
  onZoomIn,
  onZoomOut,
  onResetPlacement,
}) => (
  <div className="space-y-2">
    <input
      ref={inputRef}
      type="file"
      accept={IMAGE_FILE_ACCEPT}
      className="hidden"
      aria-label="选择图标图片"
      onChange={onFileChange}
    />

    {icon ? (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onUploadClick}
          disabled={isProcessing}
          aria-label="更换图标"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded border border-neutral-200 bg-white p-2 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900"
          title="更换图标"
        >
          <span
            aria-hidden="true"
            className="block h-full w-full bg-contain bg-center bg-no-repeat"
            style={{ backgroundImage: `url("${icon}")` }}
          />
        </button>
        <div className="flex min-w-0 flex-1 gap-2">
          <button
            type="button"
            onClick={onUploadClick}
            disabled={isProcessing}
            className={`flex h-8 items-center gap-1.5 px-2 text-xs font-medium disabled:opacity-50 ${SOFT_BUTTON_CLASS}`}
          >
            <Upload className="h-3 w-3" />
            {isProcessing ? '处理中' : '更换'}
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={isProcessing}
            className={`flex h-8 items-center gap-1.5 px-2 text-xs font-medium disabled:opacity-50 ${SOFT_BUTTON_CLASS}`}
          >
            <X className="h-3 w-3" />
            移除
          </button>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={onZoomOut}
            disabled={isProcessing}
            aria-label="缩小图标"
            title="缩小图标"
            className={`flex h-8 w-8 items-center justify-center disabled:opacity-50 ${SOFT_BUTTON_CLASS}`}
          >
            <Minus className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={onZoomIn}
            disabled={isProcessing}
            aria-label="放大图标"
            title="放大图标"
            className={`flex h-8 w-8 items-center justify-center disabled:opacity-50 ${SOFT_BUTTON_CLASS}`}
          >
            <Plus className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={onResetPlacement}
            disabled={isProcessing}
            aria-label="复位图标位置"
            title="复位图标位置"
            className={`flex h-8 w-8 items-center justify-center disabled:opacity-50 ${SOFT_BUTTON_CLASS}`}
          >
            <RotateCcw className="h-3 w-3" />
          </button>
        </div>
      </div>
    ) : (
      <button
        type="button"
        onClick={onUploadClick}
        disabled={isProcessing}
        className={`flex h-10 w-full items-center justify-center gap-2 text-xs font-medium disabled:opacity-50 ${SOFT_BUTTON_CLASS}`}
      >
        <ImageIcon className="h-4 w-4" />
        {isProcessing ? '处理中' : '添加图标'}
      </button>
    )}
  </div>
);
