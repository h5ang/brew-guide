import {
  ImageProcessingError,
  processImageFile,
} from '@/lib/images/imageProcessing';

const MAX_SOURCE_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const SOURCE_MAX_SIDE = 768;
const OUTPUT_MAX_SIDE = 320;
const TRIM_ALPHA_THRESHOLD = 8;
const TRIM_LUMINANCE_THRESHOLD = 248;

type Bounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

const getLuminance = (red: number, green: number, blue: number): number =>
  red * 0.299 + green * 0.587 + blue * 0.114;

const loadImage = (src: string, file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(
        new ImageProcessingError(
          '图标解码失败，请更换图片后重试',
          'decode-failed',
          file
        )
      );
    image.src = src;
  });

const createCanvas = (width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  return canvas;
};

const expandBounds = (
  bounds: Bounds,
  width: number,
  height: number,
  paddingRatio = 0.06
): Bounds => {
  const padding = Math.ceil(
    Math.max(bounds.right - bounds.left + 1, bounds.bottom - bounds.top + 1) *
      paddingRatio
  );

  return {
    left: Math.max(0, bounds.left - padding),
    top: Math.max(0, bounds.top - padding),
    right: Math.min(width - 1, bounds.right + padding),
    bottom: Math.min(height - 1, bounds.bottom + padding),
  };
};

const createEmptyBounds = (): Bounds => ({
  left: Number.POSITIVE_INFINITY,
  top: Number.POSITIVE_INFINITY,
  right: Number.NEGATIVE_INFINITY,
  bottom: Number.NEGATIVE_INFINITY,
});

const includePixel = (bounds: Bounds, x: number, y: number): void => {
  bounds.left = Math.min(bounds.left, x);
  bounds.top = Math.min(bounds.top, y);
  bounds.right = Math.max(bounds.right, x);
  bounds.bottom = Math.max(bounds.bottom, y);
};

const hasBounds = (bounds: Bounds): boolean =>
  Number.isFinite(bounds.left) &&
  Number.isFinite(bounds.top) &&
  Number.isFinite(bounds.right) &&
  Number.isFinite(bounds.bottom);

const getContentBounds = (
  imageData: ImageData,
  width: number,
  height: number
): Bounds => {
  const visualBounds = createEmptyBounds();
  const alphaBounds = createEmptyBounds();
  const { data } = imageData;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const alpha = data[index + 3];

      if (alpha <= TRIM_ALPHA_THRESHOLD) {
        continue;
      }

      includePixel(alphaBounds, x, y);

      const luminance = getLuminance(
        data[index],
        data[index + 1],
        data[index + 2]
      );
      if (luminance < TRIM_LUMINANCE_THRESHOLD) {
        includePixel(visualBounds, x, y);
      }
    }
  }

  const bounds = hasBounds(visualBounds)
    ? visualBounds
    : hasBounds(alphaBounds)
      ? alphaBounds
      : { left: 0, top: 0, right: width - 1, bottom: height - 1 };

  return expandBounds(bounds, width, height);
};

const getOtsuThreshold = (grayscale: number[]): number => {
  const histogram = new Array<number>(256).fill(0);
  grayscale.forEach(value => {
    histogram[Math.max(0, Math.min(255, Math.round(value)))] += 1;
  });

  const total = grayscale.length;
  const sum = histogram.reduce((acc, count, value) => acc + value * count, 0);
  let backgroundWeight = 0;
  let backgroundSum = 0;
  let maxVariance = 0;
  let threshold = 160;

  for (let value = 0; value < histogram.length; value += 1) {
    backgroundWeight += histogram[value];
    if (backgroundWeight === 0) continue;

    const foregroundWeight = total - backgroundWeight;
    if (foregroundWeight === 0) break;

    backgroundSum += value * histogram[value];
    const backgroundMean = backgroundSum / backgroundWeight;
    const foregroundMean = (sum - backgroundSum) / foregroundWeight;
    const variance =
      backgroundWeight *
      foregroundWeight *
      (backgroundMean - foregroundMean) *
      (backgroundMean - foregroundMean);

    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = value;
    }
  }

  return Math.max(96, Math.min(210, threshold));
};

const distributeError = (
  errors: number[],
  width: number,
  height: number,
  x: number,
  y: number,
  error: number
): void => {
  const add = (nextX: number, nextY: number, ratio: number) => {
    if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) {
      return;
    }
    errors[nextY * width + nextX] += error * ratio;
  };

  add(x + 1, y, 7 / 16);
  add(x - 1, y + 1, 3 / 16);
  add(x, y + 1, 5 / 16);
  add(x + 1, y + 1, 1 / 16);
};

const applyThermalDither = (imageData: ImageData): void => {
  const { width, height, data } = imageData;
  const grayscale = new Array<number>(width * height);

  for (let index = 0; index < grayscale.length; index += 1) {
    const offset = index * 4;
    grayscale[index] = getLuminance(
      data[offset],
      data[offset + 1],
      data[offset + 2]
    );
  }

  const threshold = getOtsuThreshold(grayscale);
  const errors = new Array<number>(width * height).fill(0);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const offset = index * 4;
      const value = grayscale[index] + errors[index];
      const output = value < threshold ? 0 : 255;
      const error = value - output;

      data[offset] = output;
      data[offset + 1] = output;
      data[offset + 2] = output;
      data[offset + 3] = 255;
      distributeError(errors, width, height, x, y, error);
    }
  }
};

export const processThermalPrintIcon = async (file: File): Promise<string> => {
  if (typeof document === 'undefined') {
    throw new ImageProcessingError(
      '当前环境无法处理图标',
      'decode-failed',
      file
    );
  }

  const sourceDataUrl = await processImageFile(file, {
    maxFileSizeBytes: MAX_SOURCE_FILE_SIZE_BYTES,
    compression: {
      maxSizeMB: 0.08,
      maxWidthOrHeight: SOURCE_MAX_SIDE,
      initialQuality: 0.86,
    },
  });
  const image = await loadImage(sourceDataUrl, file);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;

  if (sourceWidth <= 0 || sourceHeight <= 0) {
    throw new ImageProcessingError(
      '图标尺寸无效，请更换图片后重试',
      'decode-failed',
      file
    );
  }

  const sourceCanvas = createCanvas(sourceWidth, sourceHeight);
  const sourceContext = sourceCanvas.getContext('2d');
  if (!sourceContext) {
    throw new ImageProcessingError(
      '图标处理失败，请更换图片后重试',
      'decode-failed',
      file
    );
  }
  sourceContext.drawImage(image, 0, 0, sourceWidth, sourceHeight);

  const bounds = getContentBounds(
    sourceContext.getImageData(0, 0, sourceWidth, sourceHeight),
    sourceWidth,
    sourceHeight
  );
  const cropWidth = bounds.right - bounds.left + 1;
  const cropHeight = bounds.bottom - bounds.top + 1;
  const scale = Math.min(
    OUTPUT_MAX_SIDE / cropWidth,
    OUTPUT_MAX_SIDE / cropHeight
  );
  const outputWidth = Math.max(1, Math.round(cropWidth * scale));
  const outputHeight = Math.max(1, Math.round(cropHeight * scale));
  const outputCanvas = createCanvas(outputWidth, outputHeight);
  const outputContext = outputCanvas.getContext('2d');

  if (!outputContext) {
    throw new ImageProcessingError(
      '图标处理失败，请更换图片后重试',
      'decode-failed',
      file
    );
  }

  outputContext.fillStyle = '#ffffff';
  outputContext.fillRect(0, 0, outputWidth, outputHeight);
  outputContext.imageSmoothingEnabled = true;
  outputContext.imageSmoothingQuality = 'high';
  outputContext.drawImage(
    image,
    bounds.left,
    bounds.top,
    cropWidth,
    cropHeight,
    0,
    0,
    outputWidth,
    outputHeight
  );

  const outputImageData = outputContext.getImageData(
    0,
    0,
    outputWidth,
    outputHeight
  );
  applyThermalDither(outputImageData);
  outputContext.putImageData(outputImageData, 0, 0);

  return outputCanvas.toDataURL('image/png');
};
