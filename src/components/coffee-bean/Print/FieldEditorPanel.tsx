'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { DatePicker } from '@/components/common/ui/DatePicker';
import { PrintConfig, EditableContent, PrintFieldKey } from './types';
import { IconFieldEditor } from './IconFieldEditor';
import {
  PRINT_EDITOR_FIELD_LABELS,
  PRINT_TEXT_FIELD_PLACEHOLDERS,
  PrintTextFieldKey,
} from './fields';

const INPUT_CLASS =
  'w-full rounded border border-neutral-200/50 bg-white px-2 py-1.5 text-xs focus:ring-2 focus:ring-neutral-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800';
const SOFT_BUTTON_CLASS =
  'rounded bg-neutral-200/50 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700';

const createEditorItemKey = (): string => {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  return `editor-item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

const autoResizeTextarea = (textarea: HTMLTextAreaElement) => {
  textarea.style.height = 'auto';
  textarea.style.height = `${textarea.scrollHeight}px`;
};

interface FlavorFieldEditorProps {
  flavors: string[];
  onUpdateFlavorItem: (index: number, value: string) => void;
  onAddFlavor: () => void;
  onRemoveFlavor: (index: number) => void;
}

const FlavorFieldEditor: React.FC<FlavorFieldEditorProps> = ({
  flavors,
  onUpdateFlavorItem,
  onAddFlavor,
  onRemoveFlavor,
}) => {
  const [flavorKeys, setFlavorKeys] = useState<string[]>(() =>
    flavors.map(() => createEditorItemKey())
  );

  const visibleFlavorKeys = useMemo(() => {
    if (flavorKeys.length >= flavors.length) {
      return flavorKeys.slice(0, flavors.length);
    }

    return [
      ...flavorKeys,
      ...Array.from(
        { length: flavors.length - flavorKeys.length },
        createEditorItemKey
      ),
    ];
  }, [flavorKeys, flavors.length]);

  const handleAddFlavor = () => {
    setFlavorKeys([...visibleFlavorKeys, createEditorItemKey()]);
    onAddFlavor();
  };

  const handleRemoveFlavor = (index: number) => {
    setFlavorKeys(visibleFlavorKeys.filter((_, i) => i !== index));
    onRemoveFlavor(index);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div />
        <button
          type="button"
          onClick={handleAddFlavor}
          aria-label="添加风味"
          className={`flex h-6 w-6 items-center justify-center ${SOFT_BUTTON_CLASS}`}
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
      <div className="space-y-2">
        {flavors.map((flavor, index) => (
          <div
            key={visibleFlavorKeys[index] ?? `flavor-item-${index}`}
            className="flex items-center gap-2"
          >
            <textarea
              data-autosize="true"
              value={flavor}
              onChange={e => onUpdateFlavorItem(index, e.target.value)}
              onInput={e => autoResizeTextarea(e.currentTarget)}
              className={`${INPUT_CLASS} min-h-[32px] flex-1 resize-none overflow-hidden leading-[1.4]`}
              placeholder="风味描述"
              rows={1}
            />
            <button
              type="button"
              onClick={() => handleRemoveFlavor(index)}
              aria-label="删除风味"
              className={`flex h-6 w-6 items-center justify-center ${SOFT_BUTTON_CLASS}`}
            >
              <Minus className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

interface FieldEditorPanelProps {
  config: PrintConfig;
  content: EditableContent;
  activeField: PrintFieldKey;
  activeStatusLabel: string;
  activeStatusButtonClass: string;
  iconInputRef: React.RefObject<HTMLInputElement | null>;
  isIconProcessing: boolean;
  onToggleField: (field: keyof PrintConfig['fields']) => void;
  onUpdateField: <K extends keyof EditableContent>(
    field: K,
    value: EditableContent[K]
  ) => void;
  onUpdateFlavorItem: (index: number, value: string) => void;
  onAddFlavor: () => void;
  onRemoveFlavor: (index: number) => void;
  onIconFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onIconUploadClick: () => void;
  onRemoveIcon: () => void;
  onZoomIconIn: () => void;
  onZoomIconOut: () => void;
  onResetIconPlacement: () => void;
}

export const FieldEditorPanel: React.FC<FieldEditorPanelProps> = ({
  config: _config,
  content,
  activeField,
  activeStatusLabel,
  activeStatusButtonClass,
  iconInputRef,
  isIconProcessing,
  onToggleField,
  onUpdateField,
  onUpdateFlavorItem,
  onAddFlavor,
  onRemoveFlavor,
  onIconFileChange,
  onIconUploadClick,
  onRemoveIcon,
  onZoomIconIn,
  onZoomIconOut,
  onResetIconPlacement,
}) => {
  const editorPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!editorPanelRef.current) {
      return;
    }
    const textareas = editorPanelRef.current.querySelectorAll(
      'textarea[data-autosize="true"]'
    );
    textareas.forEach(textarea =>
      autoResizeTextarea(textarea as HTMLTextAreaElement)
    );
  }, [content, activeField]);

  const renderTextInput = (field: PrintTextFieldKey, placeholder: string) => (
    <textarea
      data-autosize="true"
      value={content[field]}
      onChange={e => onUpdateField(field, e.target.value)}
      onInput={e => autoResizeTextarea(e.currentTarget)}
      className={`${INPUT_CLASS} min-h-[32px] resize-none overflow-hidden leading-[1.4]`}
      placeholder={placeholder}
      rows={1}
    />
  );

  const renderDateInput = () => (
    <div className="text-xs">
      <DatePicker
        date={content.roastDate ? new Date(content.roastDate) : undefined}
        onDateChange={date => {
          onUpdateField('roastDate', date.toISOString().split('T')[0]);
        }}
        placeholder="选择烘焙日期"
        locale="zh-CN"
      />
    </div>
  );

  const renderFieldEditor = () => {
    switch (activeField) {
      case 'name':
        return (
          <div className="space-y-2">
            <div className="space-y-1">
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                烘焙商（可选）
              </div>
              <textarea
                data-autosize="true"
                value={content.roaster}
                onChange={e => onUpdateField('roaster', e.target.value)}
                onInput={e => autoResizeTextarea(e.currentTarget)}
                className={`${INPUT_CLASS} min-h-[32px] resize-none overflow-hidden leading-[1.4]`}
                placeholder="默认使用咖啡豆中的烘焙商，可手动修改"
                rows={1}
              />
            </div>
            <div className="space-y-1">
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                名称
              </div>
              {renderTextInput('name', PRINT_TEXT_FIELD_PLACEHOLDERS.name)}
            </div>
          </div>
        );
      case 'roastDate':
        return renderDateInput();
      case 'origin':
        return renderTextInput('origin', PRINT_TEXT_FIELD_PLACEHOLDERS.origin);
      case 'estate':
        return renderTextInput('estate', PRINT_TEXT_FIELD_PLACEHOLDERS.estate);
      case 'process':
        return renderTextInput(
          'process',
          PRINT_TEXT_FIELD_PLACEHOLDERS.process
        );
      case 'variety':
        return renderTextInput(
          'variety',
          PRINT_TEXT_FIELD_PLACEHOLDERS.variety
        );
      case 'roastLevel':
        return renderTextInput(
          'roastLevel',
          PRINT_TEXT_FIELD_PLACEHOLDERS.roastLevel
        );
      case 'flavor':
        return (
          <FlavorFieldEditor
            flavors={content.flavor}
            onUpdateFlavorItem={onUpdateFlavorItem}
            onAddFlavor={onAddFlavor}
            onRemoveFlavor={onRemoveFlavor}
          />
        );
      case 'weight':
        return renderTextInput('weight', PRINT_TEXT_FIELD_PLACEHOLDERS.weight);
      case 'notes':
        return (
          <textarea
            data-autosize="true"
            value={content.notes}
            onChange={e => onUpdateField('notes', e.target.value)}
            onInput={e => autoResizeTextarea(e.currentTarget)}
            className={`${INPUT_CLASS} min-h-[72px] resize-none overflow-hidden`}
            placeholder="备注信息"
            rows={3}
          />
        );
      case 'icon':
        return (
          <IconFieldEditor
            icon={content.icon}
            inputRef={iconInputRef}
            isProcessing={isIconProcessing}
            onFileChange={onIconFileChange}
            onUploadClick={onIconUploadClick}
            onRemove={onRemoveIcon}
            onZoomIn={onZoomIconIn}
            onZoomOut={onZoomIconOut}
            onResetPlacement={onResetIconPlacement}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      ref={editorPanelRef}
      className="space-y-2 rounded bg-neutral-100 p-3 dark:bg-neutral-800/50"
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0 truncate text-xs font-medium text-neutral-700 dark:text-neutral-200">
          {PRINT_EDITOR_FIELD_LABELS[activeField]}
        </div>
        <button
          type="button"
          onClick={() => onToggleField(activeField)}
          className={`shrink-0 rounded border px-2 py-1 text-xs leading-none font-medium whitespace-nowrap transition-colors ${activeStatusButtonClass}`}
        >
          {activeStatusLabel}
        </button>
      </div>

      {renderFieldEditor()}
    </div>
  );
};
