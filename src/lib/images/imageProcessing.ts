import {
  isHeifImageMimeType,
  isSupportedSourceImageFile,
  normalizeImageMimeType,
} from '@/lib/images/imageFormat';
import {
  Base64CompressionOptions,
  compressBase64Image,
  readFileAsDataUrl,
} from '@/lib/utils/imageCompression';

const DEFAULT_MAX_IMAGE_SIZE_BYTES = 50 * 1024 * 1024;

export class ImageProcessingError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'unsupported-type'
      | 'too-large'
      | 'decode-failed'
      | 'read-failed',
    readonly file?: File
  ) {
    super(message);
    this.name = 'ImageProcessingError';
  }
}

export interface ImageProcessingOptions {
  maxFileSizeBytes?: number;
  compression?: Base64CompressionOptions;
}

export interface ImageBatchProcessingOptions extends ImageProcessingOptions {
  limit?: number;
}

export interface ImageBatchProcessingResult {
  images: string[];
  errors: ImageProcessingError[];
}

export async function processImageFile(
  file: File,
  options: ImageProcessingOptions = {}
) {
  const { maxFileSizeBytes = DEFAULT_MAX_IMAGE_SIZE_BYTES, compression } =
    options;
  const mimeType = normalizeImageMimeType(file);

  if (!isSupportedSourceImageFile(file)) {
    throw new ImageProcessingError(
      '请上传 JPG、PNG、WebP 或 HEIF/HEIC 格式的图片',
      'unsupported-type',
      file
    );
  }

  if (file.size > maxFileSizeBytes) {
    throw new ImageProcessingError(
      '图片文件过大，请选择小于50MB的图片',
      'too-large',
      file
    );
  }

  let dataUrl: string;
  try {
    dataUrl = await readFileAsDataUrl(file);
  } catch {
    throw new ImageProcessingError('图片读取失败，请重试', 'read-failed', file);
  }

  try {
    return await compressBase64Image(dataUrl, compression);
  } catch {
    const message = isHeifImageMimeType(mimeType)
      ? '当前浏览器无法解码 HEIF/HEIC 图片，请在系统相册中转换为 JPG 或 PNG 后再添加'
      : '图片解码或压缩失败，请更换图片后重试';
    throw new ImageProcessingError(message, 'decode-failed', file);
  }
}

export async function processImageFiles(
  files: FileList | File[],
  options: ImageBatchProcessingOptions = {}
): Promise<ImageBatchProcessingResult> {
  const selectedFiles = Array.from(files).slice(0, options.limit);
  const result: ImageBatchProcessingResult = {
    images: [],
    errors: [],
  };

  for (const file of selectedFiles) {
    try {
      result.images.push(await processImageFile(file, options));
    } catch (error) {
      result.errors.push(
        error instanceof ImageProcessingError
          ? error
          : new ImageProcessingError(
              '图片处理失败，请更换图片后重试',
              'decode-failed',
              file
            )
      );
    }
  }

  return result;
}

export function getImageProcessingErrorMessage(errors: ImageProcessingError[]) {
  if (errors.length === 0) return '';

  const uniqueMessages = Array.from(
    new Set(errors.map(error => error.message))
  );
  return uniqueMessages.length === 1
    ? uniqueMessages[0]
    : uniqueMessages.join('\n');
}
