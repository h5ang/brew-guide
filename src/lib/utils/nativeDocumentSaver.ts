import { Capacitor, registerPlugin } from '@capacitor/core';

interface BrewGuideDocumentPlugin {
  saveFile(options: {
    sourceUri: string;
    fileName: string;
    mimeType: string;
  }): Promise<{ uri?: string }>;
}

const BrewGuideDocument =
  registerPlugin<BrewGuideDocumentPlugin>('BrewGuideDocument');

const sanitizeFileName = (fileName: string): string =>
  fileName.replace(/[\\/:*?"<>|]/g, '-').trim() || 'brew-guide-export';

export async function saveFileWithAndroidDocumentPicker(options: {
  sourceUri: string;
  fileName: string;
  mimeType: string;
}): Promise<void> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    throw new Error('Android document saver is only available on Android');
  }

  await BrewGuideDocument.saveFile({
    sourceUri: options.sourceUri,
    fileName: sanitizeFileName(options.fileName),
    mimeType: options.mimeType,
  });
}
