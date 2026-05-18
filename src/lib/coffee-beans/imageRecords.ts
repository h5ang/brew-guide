import type { CoffeeBean } from '@/types/app';

export interface CoffeeBeanImageRecord {
  beanId: string;
  image?: string;
  backImage?: string;
  imageThumbnail?: string;
  backImageThumbnail?: string;
  updatedAt: number;
}

export interface CoffeeBeanImageThumbnailRecord {
  beanId: string;
  imageThumbnail?: string;
  backImageThumbnail?: string;
  updatedAt: number;
}

export interface SplitCoffeeBeanImagesResult {
  bean: CoffeeBean;
  imageRecord?: CoffeeBeanImageRecord;
}

export const stripCoffeeBeanImages = (bean: CoffeeBean): CoffeeBean => {
  const { image: _image, backImage: _backImage, ...beanWithoutImages } = bean;
  return beanWithoutImages;
};

export const hasCoffeeBeanImages = (
  bean: Pick<CoffeeBean, 'image' | 'backImage'>
): boolean => Boolean(bean.image || bean.backImage);

export const splitCoffeeBeanImages = (
  bean: CoffeeBean
): SplitCoffeeBeanImagesResult => {
  const strippedBean = stripCoffeeBeanImages(bean);

  if (!hasCoffeeBeanImages(bean)) {
    return { bean: strippedBean };
  }

  return {
    bean: strippedBean,
    imageRecord: {
      beanId: bean.id,
      image: bean.image,
      backImage: bean.backImage,
      updatedAt: bean.timestamp || Date.now(),
    },
  };
};

export const mergeCoffeeBeanImages = (
  bean: CoffeeBean,
  imageRecord?: CoffeeBeanImageRecord | null
): CoffeeBean => {
  if (!imageRecord) {
    return bean;
  }

  return {
    ...bean,
    ...(imageRecord.image ? { image: imageRecord.image } : {}),
    ...(imageRecord.backImage ? { backImage: imageRecord.backImage } : {}),
  };
};

export const mergeCoffeeBeansWithImages = (
  beans: CoffeeBean[],
  imageRecords: CoffeeBeanImageRecord[]
): CoffeeBean[] => {
  const imageRecordByBeanId = new Map(
    imageRecords.map(record => [record.beanId, record])
  );

  return beans.map(bean =>
    mergeCoffeeBeanImages(bean, imageRecordByBeanId.get(bean.id))
  );
};
