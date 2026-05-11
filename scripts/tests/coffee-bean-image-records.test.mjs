import assert from 'node:assert/strict';
import {
  splitCoffeeBeanImages,
  mergeCoffeeBeanImages,
} from '../../src/lib/coffee-beans/imageRecords.ts';

const bean = {
  id: 'bean-1',
  timestamp: 1700000000000,
  name: 'Test Bean',
  image: 'data:image/jpeg;base64,front',
  backImage: 'data:image/jpeg;base64,back',
  roaster: 'Roaster',
};

const split = splitCoffeeBeanImages(bean);

assert.deepEqual(split.bean, {
  id: 'bean-1',
  timestamp: 1700000000000,
  name: 'Test Bean',
  roaster: 'Roaster',
});
assert.deepEqual(split.imageRecord, {
  beanId: 'bean-1',
  image: 'data:image/jpeg;base64,front',
  backImage: 'data:image/jpeg;base64,back',
  updatedAt: 1700000000000,
});

assert.deepEqual(mergeCoffeeBeanImages(split.bean, split.imageRecord), bean);
assert.equal(split.bean.image, undefined);
assert.equal(split.bean.backImage, undefined);

console.log('coffee-bean image record tests passed');
