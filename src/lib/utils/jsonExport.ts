'use client';

import { Capacitor } from '@capacitor/core';
import { TempFileManager } from '@/lib/utils/tempFileManager';

export type JsonExportMode = 'web-download' | 'native-share';

export interface JsonExportResult {
  mode: JsonExportMode;
  fileName: string;
}

export interface JsonExportOptions {
  jsonData: string;
  fileName: string;
  title?: string;
  text?: string;
  dialogTitle?: string;
}

const JSON_EXTENSION = '.json';

const ensureJsonFileName = (fileName: string): string => {
  const trimmedFileName = fileName.trim();

  if (!trimmedFileName) {
    throw new Error('导出文件名不能为空');
  }

  return trimmedFileName.endsWith(JSON_EXTENSION)
    ? trimmedFileName
    : `${trimmedFileName}${JSON_EXTENSION}`;
};

const downloadJsonInWeb = (jsonData: string, fileName: string): void => {
  const blob = new Blob([jsonData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();

  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 100);
};

export async function exportJsonFile({
  jsonData,
  fileName,
  title = '导出数据',
  text = '请选择保存位置',
  dialogTitle = '导出数据',
}: JsonExportOptions): Promise<JsonExportResult> {
  const normalizedFileName = ensureJsonFileName(fileName);

  if (!Capacitor.isNativePlatform()) {
    downloadJsonInWeb(jsonData, normalizedFileName);
    return {
      mode: 'web-download',
      fileName: normalizedFileName,
    };
  }

  await TempFileManager.shareJsonFile(jsonData, normalizedFileName, {
    title,
    text,
    dialogTitle,
  });

  return {
    mode: 'native-share',
    fileName: normalizedFileName,
  };
}
