import type { CustomEquipment, Stage } from '@/lib/core/config';
import {
  getDefaultPourType,
  getPourTypeName,
  isEspressoMachine,
  isPourTypeAvailable,
} from '@/lib/utils/equipmentUtils';

type StageTextDefaults = {
  label: string;
  detail: string;
};

const DEFAULT_FIRST_STAGE_DURATION = 10;
const DEFAULT_WAIT_STAGE_DURATION = 20;
const DEFAULT_COFFEE_DOSE = 15;
const DEFAULT_FIRST_STAGE_WATER_MULTIPLIER = 2;
const DEFAULT_ESPRESSO_EXTRACTION_DURATION = 25;

const SYSTEM_STAGE_DEFAULTS: Record<string, StageTextDefaults> = {
  circle: {
    label: '绕圈注水',
    detail: '中心向外缓慢画圈注水，均匀萃取咖啡风味',
  },
  center: {
    label: '中心注水',
    detail: '中心定点注水，降低萃取率',
  },
  ice: {
    label: '添加冰块',
    detail: '添加冰块，降低温度进行冷萃',
  },
  bypass: {
    label: 'Bypass',
    detail: '冲煮完成后添加到咖啡液中，调节浓度和口感',
  },
  wait: {
    label: '等待',
    detail: '',
  },
  other: {
    label: '',
    detail: '',
  },
};

const LEGACY_STAGE_LABELS = ['注水'];
const LEGACY_STAGE_DETAILS = ['注水'];
const ESPRESSO_DEFAULT_STAGE_LABELS = ['萃取浓缩', '饮料', '其他', ''];

const parseGramValue = (value?: string): number => {
  if (!value) return 0;

  const parsedValue = parseFloat(value.replace('g', ''));
  return Number.isFinite(parsedValue) ? parsedValue : 0;
};

const getFirstStageWater = (coffee?: string): string => {
  const coffeeDose = parseGramValue(coffee) || DEFAULT_COFFEE_DOSE;
  return String(Math.round(coffeeDose * DEFAULT_FIRST_STAGE_WATER_MULTIPLIER));
};

const getCustomAnimationDefault = (
  pourType: string,
  customEquipment: CustomEquipment
): StageTextDefaults | null => {
  const animation = customEquipment.customPourAnimations?.find(
    anim => !anim.isSystemDefault && anim.id === pourType
  );

  if (!animation?.name) {
    return null;
  }

  return {
    label: animation.name,
    detail: `使用${animation.name}注水`,
  };
};

export const getStageTextDefaults = (
  pourType: string,
  customEquipment: CustomEquipment
): StageTextDefaults => {
  const systemDefaults = SYSTEM_STAGE_DEFAULTS[pourType];

  if (customEquipment.animationType === 'custom' && pourType === 'other') {
    return SYSTEM_STAGE_DEFAULTS.other;
  }

  const customDefaults = getCustomAnimationDefault(pourType, customEquipment);
  if (customDefaults) {
    return customDefaults;
  }

  if (systemDefaults) {
    return systemDefaults;
  }

  return {
    label: '注水',
    detail: '',
  };
};

export const getManagedStageLabels = (
  customEquipment: CustomEquipment
): string[] => {
  const labels = new Set<string>([
    '',
    ...LEGACY_STAGE_LABELS,
    ...Object.values(SYSTEM_STAGE_DEFAULTS).map(item => item.label),
  ]);

  customEquipment.customPourAnimations?.forEach(animation => {
    if (animation.name) {
      labels.add(animation.name);
    }
  });

  return Array.from(labels);
};

export const getManagedStageDetails = (
  customEquipment: CustomEquipment
): string[] => {
  const details = new Set<string>([
    '',
    ...LEGACY_STAGE_DETAILS,
    ...Object.values(SYSTEM_STAGE_DEFAULTS).map(item => item.detail),
  ]);

  customEquipment.customPourAnimations?.forEach(animation => {
    if (animation.name) {
      details.add(`使用${animation.name}注水`);
    }
  });

  return Array.from(details);
};

export const isManagedStageLabel = (
  label: string | undefined,
  customEquipment: CustomEquipment
): boolean => getManagedStageLabels(customEquipment).includes(label || '');

export const isManagedStageDetail = (
  detail: string | undefined,
  customEquipment: CustomEquipment
): boolean => getManagedStageDetails(customEquipment).includes(detail || '');

export const applyRegularStagePourTypeDefaults = (
  stage: Stage,
  pourType: string,
  customEquipment: CustomEquipment
): Stage => {
  const nextStage: Stage = {
    ...stage,
    pourType,
  };

  if (pourType === 'wait') {
    return {
      ...nextStage,
      label: SYSTEM_STAGE_DEFAULTS.wait.label,
      water: '',
      detail: SYSTEM_STAGE_DEFAULTS.wait.detail,
    };
  }

  const defaults = getStageTextDefaults(pourType, customEquipment);
  const wasWaitStage = stage.pourType === 'wait';

  if (wasWaitStage || isManagedStageLabel(stage.label, customEquipment)) {
    nextStage.label = defaults.label;
  }

  if (wasWaitStage || isManagedStageDetail(stage.detail, customEquipment)) {
    nextStage.detail = defaults.detail;
  }

  return nextStage;
};

const createEspressoStageDefaults = (
  pourType: string,
  options: { blankBeverageLabel?: boolean } = {}
): Stage => ({
  duration:
    pourType === 'extraction'
      ? DEFAULT_ESPRESSO_EXTRACTION_DURATION
      : undefined,
  label:
    pourType === 'beverage' && options.blankBeverageLabel
      ? ''
      : getPourTypeName(pourType),
  water: '',
  detail: '',
  pourType,
});

const isManagedEspressoStageLabel = (
  currentPourType: string | undefined,
  nextPourType: string,
  label: string | undefined
): boolean =>
  !label ||
  ESPRESSO_DEFAULT_STAGE_LABELS.includes(label) ||
  (nextPourType === 'extraction' && currentPourType === 'beverage') ||
  (nextPourType === 'beverage' && currentPourType === 'extraction');

const applyEspressoStagePourTypeDefaults = (
  stage: Stage,
  pourType: string
): Stage => {
  const nextStage: Stage = {
    ...stage,
    pourType,
  };

  if (isManagedEspressoStageLabel(stage.pourType, pourType, stage.label)) {
    nextStage.label = getPourTypeName(pourType);
  }

  if (pourType === 'extraction') {
    nextStage.duration =
      typeof stage.duration === 'number'
        ? stage.duration
        : DEFAULT_ESPRESSO_EXTRACTION_DURATION;
  } else if (pourType === 'beverage') {
    nextStage.duration = undefined;
  }

  return nextStage;
};

export const applyStagePourTypeDefaults = (
  stage: Stage,
  pourType: string,
  customEquipment: CustomEquipment
): Stage =>
  isEspressoMachine(customEquipment)
    ? applyEspressoStagePourTypeDefaults(stage, pourType)
    : applyRegularStagePourTypeDefaults(stage, pourType, customEquipment);

export const createRegularStageDefaults = (
  pourType: string,
  customEquipment: CustomEquipment,
  options: {
    isFirstStage?: boolean;
    coffee?: string;
    valveStatus?: 'open' | 'closed';
  } = {}
): Stage => {
  if (pourType === 'wait') {
    return {
      pourType: 'wait',
      label: SYSTEM_STAGE_DEFAULTS.wait.label,
      water: '',
      duration: options.isFirstStage ? DEFAULT_FIRST_STAGE_DURATION : undefined,
      detail: SYSTEM_STAGE_DEFAULTS.wait.detail,
      ...(options.valveStatus ? { valveStatus: options.valveStatus } : {}),
    };
  }

  const defaults = getStageTextDefaults(pourType, customEquipment);
  const stage: Stage = {
    pourType,
    label: defaults.label,
    water: '',
    detail: defaults.detail,
    ...(options.valveStatus ? { valveStatus: options.valveStatus } : {}),
  };

  if (pourType !== 'bypass') {
    stage.duration = options.isFirstStage
      ? DEFAULT_FIRST_STAGE_DURATION
      : undefined;
  }

  if (options.isFirstStage) {
    stage.water = getFirstStageWater(options.coffee);
  }

  return stage;
};

export const createInitialRegularStages = (
  customEquipment: CustomEquipment,
  coffee = `${DEFAULT_COFFEE_DOSE}g`
): Stage[] => {
  const defaultPourType = getDefaultPourType(customEquipment);
  const valveStatus = customEquipment.hasValve ? 'closed' : undefined;
  const firstStage = createRegularStageDefaults(
    defaultPourType,
    customEquipment,
    {
      isFirstStage: true,
      coffee,
      valveStatus,
    }
  );

  if (defaultPourType === 'circle') {
    firstStage.label = '焖蒸(绕圈注水)';
    firstStage.detail = '中心向外绕圈，确保均匀萃取';
  }

  return [
    firstStage,
    {
      duration: DEFAULT_WAIT_STAGE_DURATION,
      label: SYSTEM_STAGE_DEFAULTS.wait.label,
      detail: SYSTEM_STAGE_DEFAULTS.wait.detail,
      pourType: 'wait',
    },
  ];
};

export const createInitialStagesForEquipment = (
  customEquipment: CustomEquipment,
  coffee = `${DEFAULT_COFFEE_DOSE}g`
): Stage[] =>
  isEspressoMachine(customEquipment)
    ? [createEspressoStageDefaults('extraction')]
    : createInitialRegularStages(customEquipment, coffee);

export const createNewStageForEquipment = (
  customEquipment: CustomEquipment,
  options: { existingStages: Stage[]; coffee: string }
): Stage => {
  if (isEspressoMachine(customEquipment)) {
    const pourType =
      options.existingStages.length > 0
        ? 'beverage'
        : getDefaultPourType(customEquipment);

    return createEspressoStageDefaults(pourType, {
      blankBeverageLabel: pourType === 'beverage',
    });
  }

  return createRegularStageDefaults(
    getDefaultPourType(customEquipment),
    customEquipment,
    {
      isFirstStage: options.existingStages.length === 0,
      coffee: options.coffee,
      valveStatus: customEquipment.hasValve ? 'closed' : undefined,
    }
  );
};

export const normalizeStageDefaults = (
  stage: Stage,
  customEquipment?: CustomEquipment
): Stage => {
  const normalizedPourType =
    customEquipment && !isPourTypeAvailable(customEquipment, stage.pourType)
      ? getDefaultPourType(customEquipment)
      : stage.pourType;

  const normalizedStage =
    normalizedPourType && normalizedPourType !== stage.pourType
      ? applyStagePourTypeDefaults(
          stage,
          normalizedPourType,
          customEquipment as CustomEquipment
        )
      : stage;

  if (normalizedStage.pourType !== 'wait') {
    return {
      ...normalizedStage,
      detail: normalizedStage.detail || '',
    };
  }

  return {
    ...normalizedStage,
    label: normalizedStage.label || SYSTEM_STAGE_DEFAULTS.wait.label,
    water: '',
    detail: LEGACY_STAGE_DETAILS.includes(normalizedStage.detail || '')
      ? ''
      : normalizedStage.detail || '',
  };
};
