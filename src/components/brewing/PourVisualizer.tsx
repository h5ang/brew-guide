'use client';

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { Stage } from '@/components/method/forms/components/types';
import type { EquipmentAnimationType } from '@/lib/core/config';
import { AnimationFrame } from './AnimationEditor';

// 定义扩展阶段类型
interface ExtendedStage extends Partial<Stage> {
  type?: 'pour' | 'wait';
  startTime?: number;
  endTime?: number;
  originalIndex?: number;
}

// 定义动画配置类型
interface AnimationConfig {
  maxIndex: number;
  isStacking?: boolean;
  frames?: AnimationFrame[]; // 添加支持自定义帧
}

interface AnimationProgress {
  context: string | null;
  currentMotionIndex: number;
  displayedIceIndices: number[];
}

const INITIAL_ANIMATION_PROGRESS: AnimationProgress = {
  context: null,
  currentMotionIndex: 1,
  displayedIceIndices: [],
};

const OPEN_VALVE_LABEL_PATTERN = /\[开阀\]/;
const CLOSED_VALVE_LABEL_PATTERN = /\[关阀\]/;

interface PourVisualizerProps {
  isRunning: boolean;
  currentStage: number;
  stages: (Stage | ExtendedStage)[];
  countdownTime: number | null;
  equipmentId?: string; // 添加设备ID属性
  isWaiting?: boolean; // 添加是否处于等待阶段的属性
  customEquipment?: Partial<{
    id: string;
    name: string;
    description: string;
    note?: string;
    animationType: EquipmentAnimationType;
    hasValve?: boolean;
    isCustom: true;
    customShapeSvg?: string;
    customValveSvg?: string;
    customValveOpenSvg?: string;
    customPourAnimations?: {
      id: string;
      name?: string;
      pourType?: 'center' | 'circle' | 'ice' | 'bypass';
      customAnimationSvg: string;
      isSystemDefault?: boolean;
      previewFrames?: number;
      frames?: AnimationFrame[];
    }[];
  }>;
}

const PourVisualizer: React.FC<PourVisualizerProps> = ({
  isRunning,
  currentStage,
  stages,
  countdownTime,
  equipmentId = 'V60', // 默认为V60
  isWaiting = false, // 默认不是等待阶段
  customEquipment,
}) => {
  const [preloadedImagesKey, setPreloadedImagesKey] = useState('');
  const [animationProgress, setAnimationProgress] = useState<AnimationProgress>(
    INITIAL_ANIMATION_PROGRESS
  );
  const animationContextRef = useRef<string | null>(null);
  const [isEasterEggActive, setIsEasterEggActive] = useState(false);

  // 添加动画控制器
  const controls = useAnimation();

  const hasValveSupport =
    equipmentId === 'CleverDripper' || Boolean(customEquipment?.hasValve);

  const valveStatus = useMemo<'open' | 'closed'>(() => {
    if (!hasValveSupport || currentStage < 0) return 'closed';

    for (let index = currentStage; index >= 0; index--) {
      const stage = stages[index];
      if (stage?.valveStatus) return stage.valveStatus;

      const label = stage?.label || '';
      if (OPEN_VALVE_LABEL_PATTERN.test(label)) return 'open';
      if (CLOSED_VALVE_LABEL_PATTERN.test(label)) return 'closed';
    }

    return 'closed';
  }, [hasValveSupport, currentStage, stages]);

  // 定义彩蛋动画变体
  const easterEggVariants = {
    normal: {
      scale: 1,
      rotate: 0,
      filter: 'hue-rotate(0deg)',
    },
    active: {
      scale: [1, 1.1, 0.9, 1.05, 1],
      rotate: [0, 10, -10, 5, 0],
      filter: [
        'hue-rotate(0deg)',
        'hue-rotate(90deg)',
        'hue-rotate(180deg)',
        'hue-rotate(270deg)',
        'hue-rotate(360deg)',
      ],
      transition: {
        duration: 1.5,
        times: [0, 0.2, 0.4, 0.6, 1],
      },
    },
  };

  // 处理彩蛋触发
  const handleEasterEgg = useCallback(async () => {
    if (!isEasterEggActive) {
      setIsEasterEggActive(true);
      await controls.start('active');
      setIsEasterEggActive(false);
    }
  }, [controls, isEasterEggActive]);

  // 移除旧的样式定义
  useEffect(() => {
    // 动态添加深色模式样式
    const style = document.createElement('style');
    style.innerHTML = `
            /* 移除所有旧的样式定义，现在使用全局 CSS */
        `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // 获取设备图片路径
  const getEquipmentImageSrc = () => {
    try {
      // 如果是自定义器具且有自定义SVG路径，使用自定义SVG
      if (customEquipment?.customShapeSvg) {
        // 自定义杯型的SVG数据直接返回，作为内联SVG使用
        return null;
      }

      // 如果是自定义器具，使用对应的基础动画类型
      if (customEquipment && customEquipment.animationType) {
        const type = customEquipment.animationType.toLowerCase();
        return `/images/icons/ui/${type}-base.svg`;
      }

      // 当设备ID为CleverDripper时，使用v60的图片
      if (equipmentId === 'CleverDripper') {
        return '/images/icons/ui/v60-base.svg';
      }

      // 检查equipmentId是否是预定义器具ID
      const standardEquipmentIds = [
        'V60',
        'Kalita',
        'Origami',
        'Orea',
        'CleverDripper',
      ];
      const isStandardEquipment = standardEquipmentIds.includes(equipmentId);

      if (isStandardEquipment) {
        // 对于标准器具，使用小写ID作为图片名
        return `/images/icons/ui/${equipmentId.toLowerCase()}-base.svg`;
      }

      // 如果是自定义器具但找不到animationType，使用默认V60图片
      return '/images/icons/ui/v60-base.svg';
    } catch (_error) {
      return '/images/icons/ui/v60-base.svg';
    }
  };

  // 获取阀门图片路径
  const getValveImageSrc = () => {
    try {
      // 如果不支持阀门，返回null表示不需要显示阀门
      if (!hasValveSupport) return null;

      // 根据阀门状态返回对应图片路径，确保始终返回有效路径
      return valveStatus === 'open'
        ? '/images/icons/ui/valve-open.svg'
        : '/images/icons/ui/valve-closed.svg';
    } catch (_error) {
      // 捕获任何可能的错误，返回默认阀门关闭图片，确保显示
      return '/images/icons/ui/valve-closed.svg';
    }
  };

  // 获取当前注水类型，优化错误处理和回退逻辑
  const getCurrentPourType = useCallback(() => {
    try {
      if (!stages[currentStage]) return 'center';

      // 获取当前阶段的pourType，如果未设置，默认使用center
      const pourType = stages[currentStage]?.pourType || 'center';

      // 检查是否是意式萃取类型或 Bypass 类型，如果是则不显示注水动画
      if (pourType === 'extraction' || pourType === 'bypass') {
        return 'none'; // 返回特殊值表示不显示动画
      }

      // 检查是否是自定义动画ID
      if (
        customEquipment?.customPourAnimations?.some(
          anim => anim.id === pourType
        )
      ) {
        return pourType;
      }

      // 检查是否是标准注水类型
      if (
        pourType === 'center' ||
        pourType === 'circle' ||
        pourType === 'ice' ||
        pourType === 'bypass' ||
        pourType === 'other'
      ) {
        return pourType;
      }

      // 如果是其他自定义动画ID，直接返回
      return pourType;
    } catch (_error) {
      return 'center';
    }
  }, [stages, currentStage, customEquipment]);

  // 定义可用的动画图片及其最大索引 - 移到组件顶部
  const availableAnimations = useMemo<Record<string, AnimationConfig>>(() => {
    // 基础动画配置
    const baseAnimations: Record<string, AnimationConfig> = {
      center: { maxIndex: 3 }, // center 只有3张图片
      circle: { maxIndex: 4 }, // circle 有4张图片
      ice: { maxIndex: 4, isStacking: true }, // 冰块动画，有4张图片，需要叠加显示
    };

    // 如果有自定义器具，添加自定义动画配置
    if (customEquipment?.customPourAnimations?.length) {
      customEquipment.customPourAnimations.forEach(animation => {
        // 使用动画ID作为键
        const animationId = animation.id;
        if (animation.frames && animation.frames.length > 0) {
          // 使用自定义帧
          baseAnimations[animationId] = {
            maxIndex: animation.frames.length,
            frames: animation.frames,
          };
        } else if (animation.customAnimationSvg) {
          // 兼容旧版单帧自定义动画
          baseAnimations[animationId] = {
            maxIndex: 1,
            frames: [{ id: 'frame-1', svgData: animation.customAnimationSvg }],
          };
        }
      });
    }

    return baseAnimations;
  }, [customEquipment]);

  // 优化预加载图片逻辑
  const imagesToPreload = useMemo(() => {
    // 基础设备图片
    const baseImages = [
      '/images/icons/ui/v60-base.svg',
      '/images/icons/ui/kalita-base.svg',
      '/images/icons/ui/origami-base.svg',
      '/images/icons/ui/orea-base.svg',
    ];

    // 聪明杯相关图片（阀门控制）
    const valveImages = [
      '/images/icons/ui/valve-open.svg',
      '/images/icons/ui/valve-closed.svg',
    ];

    // 动画类型图片
    const animationImages = [
      // center 动画图片
      ...Array.from(
        { length: availableAnimations.center.maxIndex },
        (_, i) => `/images/icons/ui/pour-center-motion-${i + 1}.svg`
      ),
      // circle 动画图片
      ...Array.from(
        { length: availableAnimations.circle.maxIndex },
        (_, i) => `/images/icons/ui/pour-circle-motion-${i + 1}.svg`
      ),
      // ice 动画图片
      ...Array.from(
        { length: availableAnimations.ice.maxIndex },
        (_, i) => `/images/icons/ui/pour-ice-motion-${i + 1}.svg`
      ),
    ];

    return [...baseImages, ...valveImages, ...animationImages];
  }, [availableAnimations]);

  const imagesPreloadKey = useMemo(
    () => imagesToPreload.join('\n'),
    [imagesToPreload]
  );

  const imagesPreloaded =
    imagesToPreload.length === 0 || preloadedImagesKey === imagesPreloadKey;

  // 优化预加载效果
  useEffect(() => {
    if (
      imagesToPreload.length === 0 ||
      preloadedImagesKey === imagesPreloadKey
    ) {
      return;
    }

    let loadedCount = 0;
    let isCancelled = false;
    const totalImages = imagesToPreload.length;
    const images: HTMLImageElement[] = [];

    const onImageLoad = () => {
      loadedCount++;
      if (!isCancelled && loadedCount >= totalImages) {
        setPreloadedImagesKey(imagesPreloadKey);
      }
    };

    // 创建并加载所有图像
    imagesToPreload.forEach(src => {
      const img = new globalThis.Image();
      images.push(img);
      img.onload = onImageLoad;
      img.onerror = onImageLoad; // 即使加载失败也继续处理
      img.src = src;
    });

    return () => {
      isCancelled = true;
      // 清理加载中的图像
      images.forEach(img => {
        img.onload = null;
        img.onerror = null;
        img.src = '';
      });
    };
  }, [imagesPreloadKey, imagesToPreload, preloadedImagesKey]);

  const currentStageData = stages[currentStage];
  const currentStageType =
    (currentStageData as ExtendedStage | undefined)?.type || 'pour';
  const currentPourTime = currentStageData?.pourTime;
  const currentPourType = getCurrentPourType();
  const currentAnimationConfig = availableAnimations[currentPourType];
  const currentAnimationMaxIndex = currentAnimationConfig?.maxIndex || 3;
  const isStackingAnimation = Boolean(currentAnimationConfig?.isStacking);

  const isPouring =
    countdownTime === null &&
    isRunning &&
    currentStage >= 0 &&
    Boolean(currentStageData) &&
    currentStageType !== 'wait' &&
    !isWaiting &&
    currentPourTime !== 0 &&
    currentPourType !== 'none';

  const animationContext = isPouring
    ? [
        currentStage,
        currentPourType,
        currentAnimationMaxIndex,
        isStackingAnimation ? 'stacking' : 'single',
      ].join(':')
    : null;

  const activeAnimationProgress =
    animationContext &&
    animationContextRef.current === animationContext &&
    animationProgress.context === animationContext
      ? animationProgress
      : INITIAL_ANIMATION_PROGRESS;
  const { currentMotionIndex, displayedIceIndices } = activeAnimationProgress;

  // 跟踪当前阶段的经过时间，用于确定是否在注水时间内 - 移到组件顶部
  useEffect(() => {
    if (!animationContext) {
      return;
    }

    animationContextRef.current = animationContext;

    // 设置定时器来控制动画时长
    const timer = setInterval(() => {
      setAnimationProgress(prev => {
        const base =
          prev.context === animationContext
            ? prev
            : {
                ...INITIAL_ANIMATION_PROGRESS,
                context: animationContext,
              };

        if (isStackingAnimation) {
          if (base.displayedIceIndices.length >= currentAnimationMaxIndex) {
            return base;
          }

          return {
            ...base,
            displayedIceIndices: [
              ...base.displayedIceIndices,
              base.displayedIceIndices.length + 1,
            ],
          };
        }

        return {
          ...base,
          currentMotionIndex:
            base.currentMotionIndex >= currentAnimationMaxIndex
              ? 1
              : base.currentMotionIndex + 1,
          displayedIceIndices: [],
        };
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      animationContextRef.current = null;
    };
  }, [animationContext, currentAnimationMaxIndex, isStackingAnimation]);

  // 检查是否使用自定义SVG
  const hasCustomSvg = Boolean(customEquipment?.customShapeSvg);
  const equipmentImageSrc = getEquipmentImageSrc();

  // 计算杯体透明度 - 在注水时为完全不透明，否则为半透明
  const equipmentOpacity = isPouring ? 'opacity-100' : 'opacity-50';

  // 获取当前动画图片路径
  const getMotionSrc = useCallback(() => {
    try {
      if (!isRunning) return null;

      const pourType = getCurrentPourType();

      // 检查对应的动画类型是否存在
      if (!pourType || !(pourType in availableAnimations)) return null;

      // 如果是冰块动画类型(isStacking=true)，使用特殊处理
      if (availableAnimations[pourType]?.isStacking) return null;

      // 如果是自定义动画，使用 frames
      if (availableAnimations[pourType]?.frames) {
        const frame =
          availableAnimations[pourType].frames?.[currentMotionIndex - 1];
        if (frame?.svgData) {
          return processCustomSvg(frame.svgData);
        }
      }

      return `/images/icons/ui/pour-${pourType}-motion-${currentMotionIndex}.svg`;
    } catch (_error) {
      return null;
    }
  }, [isRunning, getCurrentPourType, currentMotionIndex, availableAnimations]);

  // 渲染静态视图的辅助函数（用于倒计时、未运行和无当前阶段的情况）
  const renderStaticView = () => {
    return (
      <div className="relative mx-auto aspect-square w-full max-w-[300px]">
        {/* 底部杯体 - 使用自定义SVG或图片 */}
        {hasCustomSvg ? (
          <div
            className={`absolute inset-0 ${equipmentOpacity} custom-shape-svg-container outline-only custom-cup-shape transition-opacity duration-300`}
            dangerouslySetInnerHTML={{
              __html: processCustomSvg(customEquipment?.customShapeSvg || ''),
            }}
          />
        ) : (
          <Image
            src={equipmentImageSrc || '/images/icons/ui/v60-base.svg'}
            alt={equipmentId}
            fill
            className={`object-contain invert-0 dark:invert ${equipmentOpacity} transition-opacity duration-300`}
            priority
            sizes="(max-width: 768px) 100vw, 300px"
            quality={85}
            onError={() => {}}
          />
        )}
        {/* 阀门显示 */}
        {(equipmentId === 'CleverDripper' || customEquipment?.hasValve) &&
          getValveImageSrc() && (
            <div className="absolute inset-0">
              <Image
                src={getValveImageSrc() || ''}
                alt={`Valve ${valveStatus}`}
                fill
                className={`object-contain invert-0 dark:invert ${equipmentOpacity} transition-opacity duration-300`}
                sizes="(max-width: 768px) 100vw, 300px"
                quality={85}
                onError={() => {}}
              />
            </div>
          )}
      </div>
    );
  };

  // 更新 processCustomSvg 函数
  const processCustomSvg = (svgContent: string) => {
    if (!svgContent) return '';

    // 处理 SVG 内容，确保使用 CSS 变量
    let processedSvg = svgContent;

    // 替换所有颜色相关的属性为 CSS 变量
    processedSvg = processedSvg
      .replace(/stroke="black"/g, 'stroke="var(--custom-shape-color)"')
      .replace(/stroke="white"/g, 'stroke="var(--custom-shape-color)"')
      .replace(/stroke="#000000"/g, 'stroke="var(--custom-shape-color)"')
      .replace(/stroke="#FFFFFF"/g, 'stroke="var(--custom-shape-color)"')
      .replace(/stroke="#ffffff"/g, 'stroke="var(--custom-shape-color)"')
      .replace(/stroke="#000"/g, 'stroke="var(--custom-shape-color)"')
      .replace(/stroke="#fff"/g, 'stroke="var(--custom-shape-color)"')
      .replace(/stroke="currentColor"/g, 'stroke="var(--custom-shape-color)"')
      .replace(/fill="black"/g, 'fill="none"')
      .replace(/fill="white"/g, 'fill="none"')
      .replace(/fill="#000000"/g, 'fill="none"')
      .replace(/fill="#FFFFFF"/g, 'fill="none"')
      .replace(/fill="#ffffff"/g, 'fill="none"')
      .replace(/fill="#000"/g, 'fill="none"')
      .replace(/fill="#fff"/g, 'fill="none"')
      .replace(/fill="currentColor"/g, 'fill="none"');

    // 检查是否已经包含 viewBox
    const hasViewBox = /viewBox="[^"]*"/.test(processedSvg);

    // 添加 SVG 属性和类名
    processedSvg = processedSvg.replace(/<svg([^>]*)>/, (_, attributes) => {
      // 添加缺失的 viewBox
      const viewBoxAttr = hasViewBox ? '' : ' viewBox="0 0 300 300"';
      // 添加统一的宽高和类名
      return `<svg${attributes}${viewBoxAttr} width="300" height="300" class="custom-cup-shape outline-only">`;
    });

    // 确保所有路径使用统一的线条粗细（保持原有的stroke-width属性）
    processedSvg = processedSvg.replace(/<path([^>]*)>/g, (_, attributes) => {
      // 如果属性中没有stroke属性，添加默认stroke
      if (!attributes.includes('stroke=')) {
        attributes += ' stroke="var(--custom-shape-color)"';
      }

      // 如果属性中没有stroke-width属性，添加默认stroke-width
      if (!attributes.includes('stroke-width=')) {
        attributes += ' stroke-width="1.5"';
      }

      // 如果属性中没有fill属性，或者fill不是none，设置为none
      if (
        !attributes.includes('fill=') ||
        !attributes.includes('fill="none"')
      ) {
        attributes = attributes.replace(/fill="[^"]*"/g, 'fill="none"');
        if (!attributes.includes('fill=')) {
          attributes += ' fill="none"';
        }
      }

      return `<path${attributes}>`;
    });

    return processedSvg;
  };

  // 检查当前阶段是否存在
  if (!currentStageData) {
    return renderStaticView();
  }

  const motionSrc = getMotionSrc();

  // 检查当前动画类型是否有效
  const isValidAnimation = currentAnimationConfig !== undefined;

  // 再次检查倒计时状态，双重保险
  const shouldShowAnimation =
    isPouring && imagesPreloaded && isValidAnimation && countdownTime === null;

  // 如果在倒计时期间，立即返回静态视图
  if (countdownTime !== null) {
    return renderStaticView();
  }

  // 如果不在运行中或阶段无效，也返回静态视图
  if (!isRunning || currentStage < 0) {
    return renderStaticView();
  }

  return (
    <motion.div
      className={`relative mx-auto aspect-square w-full max-w-[300px] overflow-hidden ${isRunning ? 'bg-transparent' : 'bg-neutral-900'} ${isPouring ? 'isPouring' : ''}`}
      variants={easterEggVariants}
      animate={controls}
      initial="normal"
      onDoubleClick={handleEasterEgg}
      onContextMenu={e => {
        e.preventDefault();
        handleEasterEgg();
      }}
    >
      {/* 基础杯型 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`equipment-${equipmentId}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0"
        >
          {!customEquipment?.customShapeSvg ? (
            // 标准SVG图像文件
            <Image
              src={equipmentImageSrc || '/images/icons/ui/v60-base.svg'}
              alt={equipmentId || 'V60'}
              fill
              className={`object-contain invert-0 dark:invert ${equipmentOpacity}`}
              sizes="(max-width: 768px) 100vw, 300px"
              quality={85}
              priority={true}
              onError={() => {}}
            />
          ) : (
            // 自定义SVG内联数据
            <div
              className={`custom-cup-shape outline-only h-full w-full ${equipmentOpacity}`}
              dangerouslySetInnerHTML={{
                __html: processCustomSvg(customEquipment.customShapeSvg),
              }}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* 阀门显示 */}
      {(equipmentId === 'CleverDripper' || customEquipment?.hasValve) &&
        getValveImageSrc() && (
          <div className="absolute inset-0">
            <Image
              src={getValveImageSrc() || ''}
              alt={`Valve ${valveStatus}`}
              fill
              className={`object-contain invert-0 dark:invert ${equipmentOpacity} transition-opacity duration-300`}
              sizes="(max-width: 768px) 100vw, 300px"
              quality={85}
              onError={() => {}}
            />
          </div>
        )}

      {/* 注水动画 */}
      <AnimatePresence mode="sync">
        {shouldShowAnimation && (
          <>
            {/* 对于普通动画类型 */}
            {!availableAnimations[
              currentPourType as keyof typeof availableAnimations
            ]?.isStacking && (
              <motion.div
                key={`${currentStage}-${currentMotionIndex}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.26 }}
                className="absolute inset-0"
              >
                {availableAnimations[
                  currentPourType as keyof typeof availableAnimations
                ]?.frames ? (
                  // 使用自定义帧
                  <div
                    className="custom-cup-shape outline-only flex h-full w-full items-center justify-center"
                    dangerouslySetInnerHTML={{
                      __html: processCustomSvg(
                        availableAnimations[
                          currentPourType as keyof typeof availableAnimations
                        ]?.frames?.[currentMotionIndex - 1]?.svgData || ''
                      ),
                    }}
                  />
                ) : (
                  // 使用标准图片
                  <Image
                    src={motionSrc || ''}
                    alt={`Pour ${currentPourType}`}
                    fill
                    className="object-contain invert-0 dark:invert"
                    sizes="(max-width: 768px) 100vw, 300px"
                    quality={85}
                    loading="eager"
                    onError={() => {}}
                  />
                )}
              </motion.div>
            )}

            {/* 对于叠加动画类型（ice），显示多个叠加的动画 */}
            {currentPourType === 'ice' &&
              displayedIceIndices.map(index => (
                <motion.div
                  key={`ice-${index}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.26 }}
                  className="absolute inset-0"
                >
                  <Image
                    src={`/images/icons/ui/pour-ice-motion-${index}.svg`}
                    alt={`Ice cube ${index}`}
                    fill
                    className="object-contain invert-0 dark:invert"
                    sizes="(max-width: 768px) 100vw, 300px"
                    quality={85}
                    loading="eager"
                    onError={() => {}}
                  />
                </motion.div>
              ))}
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PourVisualizer;
