'use client';

export interface ImageViewerPayload {
  url: string;
  alt: string;
  backUrl?: string;
  items?: ImageViewerItem[];
  index?: number;
  sourceElement?: HTMLElement | null;
  sourceElements?: Array<HTMLElement | null | undefined>;
  action?: ImageViewerAction;
}

export interface ImageViewerItem {
  url: string;
  alt: string;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
  sourceElement?: HTMLElement | null;
}

export interface ImageViewerAction {
  label: string;
  loadingLabel?: string;
  ariaLabel?: string;
  onClick: () => void | Promise<void>;
}

export const IMAGE_VIEWER_OPEN_EVENT = 'imageViewerOpen';

export const openImageViewer = (payload: ImageViewerPayload) => {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent<ImageViewerPayload>(IMAGE_VIEWER_OPEN_EVENT, {
      detail: payload,
    })
  );
};

declare global {
  interface WindowEventMap {
    imageViewerOpen: CustomEvent<ImageViewerPayload>;
  }
}
