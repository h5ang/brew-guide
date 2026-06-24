'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { ChevronRight } from 'lucide-react';
import { NoteItemProps } from '../types';
import { formatDate } from '../utils';
import {
  getBeanDisplayInitial,
  getRoasterName,
} from '@/lib/utils/beanVarietyUtils';
import { useRoasterLogo, useSettingsStore } from '@/lib/stores/settingsStore';
import { useBrewingNoteStore } from '@/lib/stores/brewingNoteStore';
import { openImageViewer } from '@/lib/ui/imageViewer';
import {
  getBeanUnitPrice,
  resolveNoteBean,
  resolveNoteBeanDisplayName,
  resolveNoteEquipmentName,
} from '@/lib/notes/noteDisplay';
import { useCoffeeBeanImage } from '@/lib/hooks/useCoffeeBeanImage';
import { useBrewingNoteImages } from '@/lib/hooks/useBrewingNoteImages';
import { getCoffeeBeanImageSource } from '@/lib/coffee-beans/imageRepository';

// 动态导入 RatingRadarDrawer 组件
const RatingRadarDrawer = dynamic(
  () => import('@/components/notes/Detail/RatingRadarDrawer'),
  {
    ssr: false,
  }
);

const SINGLE_IMAGE_MAX_WIDTH = 140;

const getTextInitial = (text: string | undefined): string => {
  const trimmedText = text?.trim();
  return trimmedText ? Array.from(trimmedText)[0] : '';
};

// 优化笔记项组件以避免不必要的重渲染
const NoteItem: React.FC<NoteItemProps> = ({
  note,
  equipmentNames,
  isShareMode = false,
  isSelected = false,
  onToggleSelect,
  isFirst = false,
  isLast = false,
  getValidTasteRatings,
  coffeeBeans = [],
  coffeeBeanLookup,
  storedImageCount = 0,
}) => {
  // 获取烘焙商相关设置
  const roasterFieldEnabled = useSettingsStore(
    state => state.settings.roasterFieldEnabled
  );
  const roasterSeparator = useSettingsStore(
    state => state.settings.roasterSeparator
  );
  const roasterSettings = useMemo(
    () => ({
      roasterFieldEnabled,
      roasterSeparator,
    }),
    [roasterFieldEnabled, roasterSeparator]
  );

  // 获取评分维度入口显示设置
  const showRatingDimensionsEntry = useSettingsStore(
    state => state.settings.showRatingDimensionsEntry ?? false
  );

  // 图片错误状态
  const [failedImageSource, setFailedImageSource] = useState<string | null>(
    null
  );
  const [noteImageError, setNoteImageError] = useState(false);

  // 评分雷达图抽屉状态
  const [showRatingRadar, setShowRatingRadar] = useState(false);

  // 获取所有笔记用于对比
  const allNotes = useBrewingNoteStore(state => state.notes);

  // 获取该咖啡豆的所有有风味评分的笔记（用于对比）
  const compareNotes = React.useMemo(() => {
    if (!note.beanId) return [];
    return allNotes
      .filter(
        n =>
          n.beanId === note.beanId &&
          n.taste &&
          Object.values(n.taste).some(v => v > 0)
      )
      .map(n => ({
        id: n.id,
        timestamp: n.timestamp,
        taste: n.taste,
        method: n.method,
      }));
  }, [note.beanId, allNotes]);

  // 获取笔记图片列表
  const inlineNoteImages = React.useMemo(() => {
    if (note.images && note.images.length > 0) return note.images;
    if (note.image) return [note.image];
    return [];
  }, [note.images, note.image]);
  const noteImages = useBrewingNoteImages(note.id, inlineNoteImages);

  // 预先计算一些条件，避免在JSX中重复计算
  const validTasteRatings = getValidTasteRatings
    ? getValidTasteRatings(note.taste)
    : [];
  const hasTasteRatings = validTasteRatings.length > 0;
  const hasNotes = Boolean(note.notes);
  const imageSlotCount = noteImages.length || storedImageCount;
  const isSingleNoteImage = imageSlotCount === 1;
  const visibleNoteImages =
    noteImages.length > 0 ? noteImages : Array(imageSlotCount).fill('');
  const equipmentName = resolveNoteEquipmentName(note, equipmentNames);

  // 获取完整的咖啡豆信息（包括图片），优先使用实时关联的咖啡豆
  const beanInfo =
    resolveNoteBean(note, coffeeBeanLookup) ||
    (note.beanId
      ? coffeeBeans.find(bean => bean.id === note.beanId) || null
      : null);

  const beanName = resolveNoteBeanDisplayName(
    note,
    coffeeBeanLookup,
    {
      roasterFieldEnabled,
      roasterSeparator,
    },
    beanInfo
  );
  const beanUnitPrice = getBeanUnitPrice(beanInfo);
  const beanImage = useCoffeeBeanImage(beanInfo?.id, {
    preferThumbnail: true,
  });
  const beanPlaceholderInitial = beanInfo
    ? getBeanDisplayInitial(beanInfo)
    : getTextInitial(beanName) || getTextInitial(note.notes) || '豆';

  const roasterLogoName = useMemo(() => {
    if (!beanInfo || beanImage) {
      return null;
    }

    const roasterName = getRoasterName(beanInfo, roasterSettings);
    return roasterName && roasterName !== '未知烘焙商' ? roasterName : null;
  }, [beanImage, beanInfo, roasterSettings]);
  const roasterLogo = useRoasterLogo(roasterLogoName);
  const imageSource = beanImage || roasterLogo;
  const imageError = failedImageSource === imageSource;

  const handleBeanImageClick = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.stopPropagation();
      if (!imageSource || imageError) {
        return;
      }

      const sourceElement = event.currentTarget;

      void (async () => {
        const [frontImage, backImage] =
          beanImage && beanInfo?.id
            ? await Promise.all([
                getCoffeeBeanImageSource(beanInfo.id, {
                  preferThumbnail: false,
                }),
                getCoffeeBeanImageSource(beanInfo.id, {
                  side: 'back',
                  preferThumbnail: false,
                }),
              ])
            : [undefined, undefined];

        const isBeanImage = Boolean(beanImage);
        openImageViewer({
          url:
            frontImage ||
            (isBeanImage ? beanInfo?.image : undefined) ||
            imageSource,
          alt: isBeanImage
            ? beanName || '咖啡豆图片'
            : beanInfo
              ? `${getRoasterName(beanInfo, roasterSettings)} 烘焙商图标`
              : '烘焙商图标',
          backUrl: backImage || beanInfo?.backImage,
          sourceElement,
        });
      })();
    },
    [beanImage, beanInfo, beanName, imageError, imageSource, roasterSettings]
  );

  const handleNoteImageClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();

      const sourceElement = event.currentTarget;
      const { imageUrl, imageIndex } = sourceElement.dataset;
      if (!imageUrl || !imageIndex) {
        return;
      }

      if (noteImageError) {
        return;
      }

      const index = Number(imageIndex);
      if (!Number.isInteger(index)) {
        return;
      }

      const galleryElement = event.currentTarget.closest('[data-note-images]');
      const sourceElements = galleryElement
        ? Array.from(
            galleryElement.querySelectorAll<HTMLElement>('[data-image-index]')
          )
        : [sourceElement];

      openImageViewer({
        url: noteImages[index] || imageUrl,
        alt: `笔记图片 ${index + 1}`,
        items: noteImages.map((url, itemIndex) => ({
          url,
          alt: `笔记图片 ${itemIndex + 1}`,
        })),
        index,
        sourceElement,
        sourceElements,
      });
    },
    [noteImageError, noteImages]
  );

  // 处理笔记点击事件
  const handleNoteClick = () => {
    if (isShareMode && onToggleSelect) {
      onToggleSelect(note.id);
    } else {
      // 非分享模式下，触发打开详情事件
      window.dispatchEvent(
        new CustomEvent('noteDetailOpened', {
          detail: {
            note,
            equipmentName,
            beanUnitPrice,
            beanInfo, // 传递完整的咖啡豆信息
          },
        })
      );
    }
  };

  return (
    <>
      <div
        className={`group px-6 ${isFirst ? 'pt-5' : 'pt-3.5'} pb-3.5 ${!isLast ? 'border-b border-neutral-200/50 dark:border-neutral-800/50' : ''} ${!isShareMode ? 'cursor-pointer' : 'cursor-pointer'} note-item`}
        onClick={handleNoteClick}
        data-note-id={note.id}
      >
        <div className="flex gap-3.5">
          {/* 咖啡豆图片 - 方形带圆角，固定在左侧 */}
          <div
            className="relative h-12 w-12 shrink-0 cursor-pointer overflow-hidden rounded border border-neutral-200/50 bg-neutral-100 dark:border-neutral-800/50 dark:bg-neutral-800/20"
            onClick={handleBeanImageClick}
          >
            {beanImage && !imageError ? (
              <Image
                src={beanImage}
                alt={beanName || '咖啡豆图片'}
                height={48}
                width={48}
                unoptimized
                style={{ width: '100%', height: '100%' }}
                className="object-cover"
                sizes="48px"
                priority={false}
                loading="lazy"
                placeholder="blur"
                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                onError={() => setFailedImageSource(beanImage)}
              />
            ) : roasterLogo && !imageError ? (
              <Image
                src={roasterLogo}
                alt={
                  beanInfo
                    ? getRoasterName(beanInfo, roasterSettings) + ' 烘焙商图标'
                    : '烘焙商图标'
                }
                height={48}
                width={48}
                unoptimized
                style={{ width: '100%', height: '100%' }}
                className="object-cover"
                sizes="48px"
                priority={false}
                loading="lazy"
                onError={() => setFailedImageSource(roasterLogo)}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-neutral-400 dark:text-neutral-600">
                {beanPlaceholderInitial}
              </div>
            )}
          </div>

          {/* 内容区域 - 垂直排列，使用统一的间距系统 */}
          <div className="min-w-0 flex-1 space-y-1.5">
            {/* 咖啡豆名称 */}
            {(beanName || isShareMode) && (
              <div className="flex items-start justify-between gap-3">
                {beanName && (
                  <div className="min-w-0 flex-1 truncate text-xs leading-tight font-medium text-neutral-800 dark:text-neutral-100">
                    {beanName}
                  </div>
                )}
                {isShareMode && (
                  <div className="relative h-[16.5px]">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={e => {
                        e.stopPropagation();
                        if (onToggleSelect) onToggleSelect(note.id);
                      }}
                      onClick={e => e.stopPropagation()}
                      className="relative h-4 w-4 appearance-none rounded-sm border border-neutral-300 text-xs checked:bg-neutral-800 checked:after:absolute checked:after:top-1/2 checked:after:left-1/2 checked:after:-translate-x-1/2 checked:after:-translate-y-1/2 checked:after:text-white checked:after:content-['✓'] dark:border-neutral-700 dark:checked:bg-neutral-200 dark:checked:after:text-black"
                    />
                  </div>
                )}
              </div>
            )}

            {/* 备注信息 */}
            {hasNotes && (
              <div className="text-xs font-medium tracking-wide whitespace-pre-line text-neutral-600 dark:text-neutral-400">
                {note.notes}
              </div>
            )}

            {/* 笔记图片 - 仿微信朋友圈九宫格 */}
            {imageSlotCount > 0 && (
              <div
                data-note-images
                className={`mt-2 gap-1 ${
                  isSingleNoteImage
                    ? 'flex'
                    : imageSlotCount === 2 || imageSlotCount === 4
                      ? 'grid max-w-50 grid-cols-2'
                      : 'grid max-w-75 grid-cols-3'
                }`}
              >
                {visibleNoteImages.map((img, index) => (
                  <button
                    key={img || `${note.id}-image-placeholder-${index}`}
                    type="button"
                    className={`relative cursor-pointer overflow-hidden rounded-[3px] border border-neutral-200/50 dark:border-neutral-800/50 ${
                      isSingleNoteImage ? 'inline-flex' : 'block aspect-square'
                    } appearance-none bg-transparent p-0`}
                    style={
                      isSingleNoteImage
                        ? {
                            width: SINGLE_IMAGE_MAX_WIDTH,
                            height: SINGLE_IMAGE_MAX_WIDTH,
                          }
                        : undefined
                    }
                    data-image-index={index}
                    data-image-url={img || undefined}
                    onClick={handleNoteImageClick}
                    aria-label={
                      img ? `查看笔记图片 ${index + 1}` : '笔记图片加载中'
                    }
                  >
                    {noteImageError ? (
                      <div className="flex h-full w-full items-center justify-center text-xs text-neutral-500 dark:text-neutral-400">
                        加载失败
                      </div>
                    ) : !img ? (
                      <div className="h-full w-full bg-neutral-100 dark:bg-neutral-800/40" />
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={img}
                        alt={`笔记图片 ${index + 1}`}
                        width={isSingleNoteImage ? SINGLE_IMAGE_MAX_WIDTH : 96}
                        height={isSingleNoteImage ? SINGLE_IMAGE_MAX_WIDTH : 96}
                        className={
                          isSingleNoteImage
                            ? 'block h-full w-full object-cover'
                            : 'block h-full w-full object-cover'
                        }
                        onError={() => setNoteImageError(true)}
                        loading="lazy"
                      />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* 时间和评分 */}
            <div className="mt-2 text-xs leading-tight font-medium text-neutral-500/60 dark:text-neutral-500/60">
              {formatDate(note.timestamp)}
              {note.rating > 0 && (
                <>
                  {' · '}
                  {note.rating}
                  /5分
                </>
              )}
            </div>

            {/* 评分维度入口 - 仿微信朋友圈样式 */}
            {showRatingDimensionsEntry && hasTasteRatings && (
              <div
                className="mt-2 -mr-6 border-t border-neutral-200/50 pt-2 pr-6 dark:border-neutral-800/50"
                data-export-hidden="true"
              >
                <div
                  className="dark:text-neutral-00 flex cursor-pointer items-center text-xs text-neutral-500 transition-colors"
                  onClick={e => {
                    e.stopPropagation();
                    setShowRatingRadar(true);
                  }}
                >
                  <span className="">
                    评分维度 {validTasteRatings.length} 项
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-600" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 评分雷达图抽屉 */}
      {hasTasteRatings && (
        <RatingRadarDrawer
          isOpen={showRatingRadar}
          onClose={() => setShowRatingRadar(false)}
          ratings={validTasteRatings}
          overallRating={note.rating}
          beanName={beanName}
          note={note.notes}
          currentNoteId={note.id}
          compareNotes={compareNotes}
        />
      )}
    </>
  );
};

export default NoteItem;
