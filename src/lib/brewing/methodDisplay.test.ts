import { describe, expect, it } from 'vitest';
import type { Method } from '@/lib/core/config';
import {
  getEspressoExtractionTime,
  getEspressoParamItems,
} from './methodDisplay';

describe('espresso method display params', () => {
  it('keeps no-stage espresso params aligned with staged methods', () => {
    const method: Method = {
      name: '无步骤意式',
      params: {
        coffee: '18g',
        water: '36g',
        ratio: '1:2',
        grindSize: '意式',
        temp: '93°C',
        extractionTime: 25,
        stages: [],
      },
    };

    expect(getEspressoParamItems(method)).toEqual([
      '咖啡粉 18g',
      '研磨度 意式',
      '萃取时长 25s',
      '液重 36g',
    ]);
  });

  it('falls back for old no-stage espresso methods saved before extractionTime', () => {
    const method: Method = {
      name: '旧无步骤意式',
      params: {
        coffee: '18g',
        water: '36',
        ratio: '1:2',
        grindSize: '意式',
        temp: '93°C',
        stages: [],
      },
    };

    expect(getEspressoExtractionTime(method)).toBe(25);
    expect(getEspressoParamItems(method)[3]).toBe('液重 36g');
  });
});
