import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CoffeeBean } from '@/types/app';
import type {
  CoffeeBeanImageRecord,
  CoffeeBeanImageThumbnailRecord,
} from './imageRecords';

const mocks = vi.hoisted(() => {
  const beans = new Map<string, CoffeeBean>();
  const images = new Map<string, CoffeeBeanImageRecord>();
  const thumbnails = new Map<string, CoffeeBeanImageThumbnailRecord>();

  const table = <T extends object>(records: Map<string, T>, key: keyof T) => ({
    get: vi.fn((id: string) => Promise.resolve(records.get(id))),
    put: vi.fn((record: T) => {
      records.set(String(record[key]), record);
      return Promise.resolve();
    }),
    bulkGet: vi.fn((ids: string[]) =>
      Promise.resolve(ids.map(id => records.get(id)))
    ),
    bulkPut: vi.fn((nextRecords: T[]) => {
      nextRecords.forEach(record => records.set(String(record[key]), record));
      return Promise.resolve();
    }),
    delete: vi.fn((id: string) => {
      records.delete(id);
      return Promise.resolve();
    }),
    bulkDelete: vi.fn((ids: string[]) => {
      ids.forEach(id => records.delete(id));
      return Promise.resolve();
    }),
    clear: vi.fn(() => {
      records.clear();
      return Promise.resolve();
    }),
    count: vi.fn(() => Promise.resolve(records.size)),
    toArray: vi.fn(() => Promise.resolve(Array.from(records.values()))),
    toCollection: vi.fn(() => ({
      primaryKeys: vi.fn(() => Promise.resolve(Array.from(records.keys()))),
    })),
    where: vi.fn(() => ({
      anyOf: (ids: string[]) => ({
        primaryKeys: vi.fn(() =>
          Promise.resolve(ids.filter(id => records.has(id)))
        ),
      }),
    })),
  });

  return {
    beans,
    images,
    thumbnails,
    db: {
      coffeeBeans: table(beans, 'id'),
      coffeeBeanImages: table(images, 'beanId'),
      coffeeBeanImageThumbnails: table(thumbnails, 'beanId'),
      transaction: vi.fn(async (...args: unknown[]) => {
        const callback = args[args.length - 1] as () => Promise<void>;
        await callback();
      }),
    },
  };
});

vi.mock('@/lib/core/db', () => ({ db: mocks.db }));

import {
  getCoffeeBeanImageBeanIds,
  getCoffeeBeanImageSource,
  replaceCoffeeBeansWithSplitImages,
} from './imageRepository';

const baseBean: CoffeeBean = {
  id: 'bean-1',
  timestamp: 1,
  name: 'Bean',
};

describe('coffee bean image repository records', () => {
  beforeEach(() => {
    mocks.beans.clear();
    mocks.images.clear();
    mocks.thumbnails.clear();
    vi.clearAllMocks();
  });

  it('finds bean image ids from original records when thumbnails are missing', async () => {
    mocks.images.set('image-only', {
      beanId: 'image-only',
      image: 'original',
      updatedAt: 1,
    });
    mocks.thumbnails.set('thumbnail-only', {
      beanId: 'thumbnail-only',
      imageThumbnail: 'thumbnail',
      updatedAt: 1,
    });

    await expect(getCoffeeBeanImageBeanIds()).resolves.toEqual(
      expect.arrayContaining(['image-only', 'thumbnail-only'])
    );
  });

  it('falls back to original image when thumbnail is missing', async () => {
    mocks.images.set('bean-1', {
      beanId: 'bean-1',
      image: 'original',
      updatedAt: 1,
    });

    await expect(getCoffeeBeanImageSource('bean-1')).resolves.toBe('original');
  });

  it('preserves stored images when replacing lightweight beans', async () => {
    mocks.images.set('bean-1', {
      beanId: 'bean-1',
      image: 'original',
      updatedAt: 1,
    });

    await replaceCoffeeBeansWithSplitImages([{ ...baseBean, timestamp: 2 }]);

    expect(mocks.images.get('bean-1')?.image).toBe('original');
  });
});
