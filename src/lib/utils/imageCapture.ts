import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import {
  getImageFormatFromMimeType,
  IMAGE_FILE_ACCEPT,
  isSupportedSourceImageFile,
  normalizeImageMimeType,
} from '@/lib/images/imageFormat';
export { compressBase64Image } from '@/lib/utils/imageCompression';

export interface ImageCaptureOptions {
  source: 'camera' | 'gallery';
  quality?: number;
  allowEditing?: boolean;
  resultType?: CameraResultType;
}

export interface ImageCaptureResult {
  dataUrl: string;
  format: string;
}

/**
 * 统一的图片选择/拍照工具函数
 * 在原生平台使用 Capacitor Camera API，在网页端使用 HTML input
 */
export async function captureImage(
  options: ImageCaptureOptions
): Promise<ImageCaptureResult> {
  const {
    source,
    quality = 90,
    allowEditing = false,
    resultType = CameraResultType.DataUrl,
  } = options;

  // 在原生平台使用 Capacitor Camera API
  if (Capacitor.isNativePlatform()) {
    try {
      const image = await Camera.getPhoto({
        quality,
        allowEditing,
        resultType,
        source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
      });

      if (!image.dataUrl) {
        throw new Error('Failed to get image data');
      }

      return {
        dataUrl: image.dataUrl,
        format: image.format || 'jpeg',
      };
    } catch (error) {
      console.error('Capacitor Camera error:', error);
      // 如果 Capacitor Camera 失败，降级到 HTML input
      return captureImageWithHtmlInput(source);
    }
  } else {
    // 在网页端使用 HTML input
    return captureImageWithHtmlInput(source);
  }
}

/**
 * 使用 HTML input 元素选择图片的降级方案
 * 优化手机端兼容性和用户体验
 */
function captureImageWithHtmlInput(
  source: 'camera' | 'gallery'
): Promise<ImageCaptureResult> {
  return new Promise((resolve, reject) => {
    try {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = IMAGE_FILE_ACCEPT;
      fileInput.style.display = 'none';

      // 根据来源设置不同的capture属性
      if (source === 'camera') {
        fileInput.setAttribute('capture', 'environment');
      }

      // 添加到DOM中以确保在所有设备上正常工作
      document.body.appendChild(fileInput);

      let isResolved = false;

      // 设置超时处理，防止用户长时间不选择
      const timeout = setTimeout(() => {
        if (!isResolved) {
          cleanup();
          reject(new Error('图片选择超时，请重试'));
        }
      }, 60000); // 60秒超时

      // 清理函数
      let cleanup = () => {
        clearTimeout(timeout);
        if (fileInput.parentNode) {
          document.body.removeChild(fileInput);
        }
      };

      // 处理文件选择
      fileInput.onchange = async e => {
        if (isResolved) return;

        const input = e.target as HTMLInputElement;

        try {
          if (!input.files || input.files.length === 0) {
            // 用户取消了选择
            isResolved = true;
            cleanup();
            reject(new Error('未选择图片'));
            return;
          }

          const file = input.files[0];

          if (!isSupportedSourceImageFile(file)) {
            isResolved = true;
            cleanup();
            reject(new Error('请上传 JPG、PNG、WebP 或 HEIF/HEIC 格式的图片'));
            return;
          }

          // 验证文件大小（最大50MB）
          if (file.size > 50 * 1024 * 1024) {
            isResolved = true;
            cleanup();
            reject(new Error('图片文件过大，请选择小于50MB的图片'));
            return;
          }

          // 读取文件
          const reader = new FileReader();

          reader.onload = () => {
            if (isResolved) return;

            isResolved = true;
            cleanup();

            const result = reader.result as string;
            if (!result) {
              reject(new Error('图片读取失败'));
              return;
            }

            resolve({
              dataUrl: result,
              format: getImageFormatFromMimeType(normalizeImageMimeType(file)),
            });
          };

          reader.onerror = () => {
            if (isResolved) return;

            isResolved = true;
            cleanup();
            reject(new Error('图片读取失败，请重试'));
          };

          // 开始读取文件
          reader.readAsDataURL(file);
        } catch (error) {
          if (isResolved) return;

          isResolved = true;
          cleanup();
          reject(
            new Error(
              '图片处理失败：' +
                (error instanceof Error ? error.message : '未知错误')
            )
          );
        }
      };

      // 处理用户取消选择（某些浏览器会触发）
      fileInput.oncancel = () => {
        if (isResolved) return;

        isResolved = true;
        cleanup();
        reject(new Error('用户取消了图片选择'));
      };

      // 监听窗口焦点变化，检测用户是否取消了选择
      let focusTimeout: NodeJS.Timeout;
      const handleFocus = () => {
        // 延迟检查，给文件选择器一些时间
        focusTimeout = setTimeout(() => {
          if (
            !isResolved &&
            (!fileInput.files || fileInput.files.length === 0)
          ) {
            // 用户可能取消了选择
            isResolved = true;
            cleanup();
            reject(new Error('图片选择被取消'));
          }
        }, 1000);
      };

      const handleBlur = () => {
        if (focusTimeout) {
          clearTimeout(focusTimeout);
        }
      };

      window.addEventListener('focus', handleFocus);
      window.addEventListener('blur', handleBlur);

      // 清理事件监听器
      const originalCleanup = cleanup;
      cleanup = () => {
        originalCleanup();
        window.removeEventListener('focus', handleFocus);
        window.removeEventListener('blur', handleBlur);
        if (focusTimeout) {
          clearTimeout(focusTimeout);
        }
      };

      // 触发文件选择器
      // 使用 setTimeout 确保在下一个事件循环中执行，提高兼容性
      setTimeout(() => {
        if (!isResolved) {
          fileInput.click();
        }
      }, 100);
    } catch (error) {
      reject(
        new Error(
          '无法打开图片选择器：' +
            (error instanceof Error ? error.message : '未知错误')
        )
      );
    }
  });
}
