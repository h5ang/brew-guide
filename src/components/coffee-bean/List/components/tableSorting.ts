import { compareBeansByFlavorPeriod } from '@/lib/utils/beanSortUtils';
import { parseDateToTimestamp } from '@/lib/utils/dateUtils';
import type { ExtendedCoffeeBean } from '../types';
import type { DateDisplayMode } from './tableColumns';

export const getAgingDays = (dateStr: string): number => {
  try {
    const timestamp = parseDateToTimestamp(dateStr);
    const roastDate = new Date(timestamp);
    const today = new Date();
    const todayDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const roastDateOnly = new Date(
      roastDate.getFullYear(),
      roastDate.getMonth(),
      roastDate.getDate()
    );
    return Math.ceil(
      (todayDate.getTime() - roastDateOnly.getTime()) / (1000 * 60 * 60 * 24)
    );
  } catch {
    return 0;
  }
};

export const getDateSortValue = (
  bean: ExtendedCoffeeBean,
  dateDisplayMode: DateDisplayMode
): number | null => {
  const isGreenBean = bean.beanState === 'green';
  const displayDate = isGreenBean ? bean.purchaseDate : bean.roastDate;
  if (!displayDate) return null;

  if (!isGreenBean && dateDisplayMode === 'agingDays') {
    return getAgingDays(displayDate);
  }

  const timestamp = parseDateToTimestamp(displayDate);
  return Number.isFinite(timestamp) ? timestamp : null;
};

const compareNullableNumbers = (
  left: number | null,
  right: number | null,
  desc: boolean
): number => {
  const leftMissing = left === null;
  const rightMissing = right === null;

  if (leftMissing && rightMissing) return 0;
  if (leftMissing) return 1;
  if (rightMissing) return -1;

  return desc ? right - left : left - right;
};

export const compareDateDisplayBeans = (
  left: ExtendedCoffeeBean,
  right: ExtendedCoffeeBean,
  dateDisplayMode: DateDisplayMode,
  desc: boolean
): number => {
  const shouldSortByFlavorPeriod =
    dateDisplayMode === 'flavorPeriod' &&
    left.beanState !== 'green' &&
    right.beanState !== 'green';

  if (shouldSortByFlavorPeriod) {
    return compareBeansByFlavorPeriod(left, right, desc);
  }

  return compareNullableNumbers(
    getDateSortValue(left, dateDisplayMode),
    getDateSortValue(right, dateDisplayMode),
    desc
  );
};
