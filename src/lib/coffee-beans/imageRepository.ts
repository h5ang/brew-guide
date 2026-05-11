import { db } from '@/lib/core/db';
import type { CoffeeBean } from '@/types/app';
import {
  type CoffeeBeanImageRecord,
  mergeCoffeeBeanImages,
  mergeCoffeeBeansWithImages,
  splitCoffeeBeanImages,
  stripCoffeeBeanImages,
} from './imageRecords';

const DEFAULT_THUMBNAIL_MAX_SIZE = 192;
const DEFAULT_THUMBNAIL_QUALITY = 0.72;

export type CoffeeBeanImageSide = 'front' | 'back';

export async function createCoffeeBeanImageThumbnail(
  dataUrl: string,
  options: {
    maxSize?: number;
    quality?: number;
  } = {}
): Promise<string> {
  if (typeof window === 'undefined' || typeof Image === 'undefined') {
    return dataUrl;
  }

  const {
    maxSize = DEFAULT_THUMBNAIL_MAX_SIZE,
    quality = DEFAULT_THUMBNAIL_QUALITY,
  } = options;

  return new Promise(resolve => {
    const image = new Image();

    image.onload = () => {
      try {
        const ratio = Math.min(
          1,
          maxSize / Math.max(image.width, image.height)
        );
        const width = Math.max(1, Math.round(image.width * ratio));
        const height = Math.max(1, Math.round(image.height * ratio));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d');
        if (!context) {
          resolve(dataUrl);
          return;
        }

        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch {
        resolve(dataUrl);
      }
    };

    image.onerror = () => resolve(dataUrl);
    image.src = dataUrl;
  });
}

const shouldDeleteImageRecord = (record: CoffeeBeanImageRecord): boolean =>
  !record.image &&
  !record.backImage &&
  !record.imageThumbnail &&
  !record.backImageThumbnail;

export async function persistCoffeeBeanImagesFromBean(
  bean: CoffeeBean,
  options: { generateThumbnails?: boolean } = {}
): Promise<CoffeeBean> {
  const { generateThumbnails = true } = options;
  const { bean: strippedBean, imageRecord } = splitCoffeeBeanImages(bean);
  const hasImageFieldUpdate =
    Object.prototype.hasOwnProperty.call(bean, 'image') ||
    Object.prototype.hasOwnProperty.call(bean, 'backImage');

  if (!imageRecord && !hasImageFieldUpdate) {
    return strippedBean;
  }

  const existingRecord = await db.coffeeBeanImages.get(bean.id);
  const nextRecord: CoffeeBeanImageRecord = {
    beanId: bean.id,
    image:
      bean.image === ''
        ? undefined
        : bean.image !== undefined
          ? bean.image
          : existingRecord?.image,
    backImage:
      bean.backImage === ''
        ? undefined
        : bean.backImage !== undefined
          ? bean.backImage
          : existingRecord?.backImage,
    imageThumbnail:
      bean.image === ''
        ? undefined
        : generateThumbnails &&
            bean.image &&
            bean.image !== existingRecord?.image
          ? await createCoffeeBeanImageThumbnail(bean.image)
          : existingRecord?.imageThumbnail,
    backImageThumbnail:
      bean.backImage === ''
        ? undefined
        : generateThumbnails &&
            bean.backImage &&
            bean.backImage !== existingRecord?.backImage
          ? await createCoffeeBeanImageThumbnail(bean.backImage)
          : existingRecord?.backImageThumbnail,
    updatedAt: imageRecord?.updatedAt || bean.timestamp || Date.now(),
  };

  if (shouldDeleteImageRecord(nextRecord)) {
    await db.coffeeBeanImages.delete(bean.id);
  } else {
    await db.coffeeBeanImages.put(nextRecord);
  }

  return strippedBean;
}

export async function getCoffeeBeanImageRecord(
  beanId: string
): Promise<CoffeeBeanImageRecord | undefined> {
  return db.coffeeBeanImages.get(beanId);
}

export async function getCoffeeBeanImageRecords(
  beanIds?: string[]
): Promise<CoffeeBeanImageRecord[]> {
  if (!beanIds) {
    return db.coffeeBeanImages.toArray();
  }

  const uniqueBeanIds = Array.from(new Set(beanIds.filter(Boolean)));
  if (uniqueBeanIds.length === 0) {
    return [];
  }

  const records = await db.coffeeBeanImages.bulkGet(uniqueBeanIds);
  return records.filter(Boolean) as CoffeeBeanImageRecord[];
}

export async function getCoffeeBeanImageBeanIds(
  beanIds?: string[]
): Promise<string[]> {
  if (!beanIds) {
    const keys = await db.coffeeBeanImages.toCollection().primaryKeys();
    return keys.map(String);
  }

  const uniqueBeanIds = Array.from(new Set(beanIds.filter(Boolean)));
  if (uniqueBeanIds.length === 0) {
    return [];
  }

  const keys = await db.coffeeBeanImages
    .where('beanId')
    .anyOf(uniqueBeanIds)
    .primaryKeys();
  return keys.map(String);
}

export async function getCoffeeBeanImageSource(
  beanId: string,
  options: {
    side?: CoffeeBeanImageSide;
    preferThumbnail?: boolean;
  } = {}
): Promise<string | undefined> {
  const { side = 'front', preferThumbnail = true } = options;
  const record = await getCoffeeBeanImageRecord(beanId);
  if (!record) return undefined;

  const imageKey = side === 'front' ? 'image' : 'backImage';
  const thumbnailKey =
    side === 'front' ? 'imageThumbnail' : 'backImageThumbnail';
  const image = record[imageKey];
  const thumbnail = record[thumbnailKey];

  if (preferThumbnail && thumbnail) {
    return thumbnail;
  }

  if (preferThumbnail && image) {
    const nextThumbnail = await createCoffeeBeanImageThumbnail(image);
    if (nextThumbnail !== image) {
      await db.coffeeBeanImages.update(beanId, {
        [thumbnailKey]: nextThumbnail,
      });
    }
    return nextThumbnail;
  }

  return image;
}

export async function mergeBeansWithStoredImages(
  beans: CoffeeBean[]
): Promise<CoffeeBean[]> {
  const imageRecords = await getCoffeeBeanImageRecords(
    beans.map(bean => bean.id)
  );
  return mergeCoffeeBeansWithImages(beans, imageRecords);
}

export async function mergeBeanWithStoredImages(
  bean: CoffeeBean
): Promise<CoffeeBean> {
  const imageRecord = await getCoffeeBeanImageRecord(bean.id);
  return mergeCoffeeBeanImages(bean, imageRecord);
}

export async function exportCoffeeBeansWithImages(): Promise<CoffeeBean[]> {
  const [beans, imageRecords] = await Promise.all([
    db.coffeeBeans.toArray(),
    db.coffeeBeanImages.toArray(),
  ]);

  return mergeCoffeeBeansWithImages(
    beans.map(stripCoffeeBeanImages),
    imageRecords
  );
}

export async function replaceCoffeeBeansWithSplitImages(
  beans: CoffeeBean[]
): Promise<void> {
  const strippedBeans: CoffeeBean[] = [];
  const imageRecords: CoffeeBeanImageRecord[] = [];

  for (const bean of beans) {
    const split = splitCoffeeBeanImages(bean);
    strippedBeans.push(split.bean);
    if (split.imageRecord) {
      imageRecords.push(split.imageRecord);
    }
  }

  await db.transaction('rw', db.coffeeBeans, db.coffeeBeanImages, async () => {
    await db.coffeeBeans.clear();
    await db.coffeeBeanImages.clear();

    if (strippedBeans.length > 0) {
      await db.coffeeBeans.bulkPut(strippedBeans);
    }

    if (imageRecords.length > 0) {
      await db.coffeeBeanImages.bulkPut(imageRecords);
    }
  });
}
