import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const listThumbnailFiles = [
  'src/components/coffee-bean/List/ListView.tsx',
  'src/components/coffee-bean/List/components/BeanListItem.tsx',
  'src/components/coffee-bean/List/components/ImageFlowView.tsx',
  'src/components/coffee-bean/List/components/StatsView/YearlyReview/YearlyReviewDrawer.tsx',
  'src/components/notes/Form/CoffeeBeanSelector.tsx',
  'src/components/notes/List/NoteItem.tsx',
  'src/components/settings/CoffeeBeanGroupSettings.tsx',
];

for (const file of listThumbnailFiles) {
  const source = readFileSync(file, 'utf8');

  assert.match(
    source,
    /useCoffeeBeanImage/,
    `${file} should resolve coffee bean thumbnails through the image repository hook`
  );
}

const groupSettings = readFileSync(
  'src/components/settings/CoffeeBeanGroupSettings.tsx',
  'utf8'
);

assert.doesNotMatch(
  groupSettings,
  /src=\{bean\.image\}/,
  'CoffeeBeanGroupSettings list thumbnails should not render the original inline bean.image'
);

const yearlyReviewDrawer = readFileSync(
  'src/components/coffee-bean/List/components/StatsView/YearlyReview/YearlyReviewDrawer.tsx',
  'utf8'
);

assert.match(
  yearlyReviewDrawer,
  /useCoffeeBeanImageSources/,
  'YearlyReviewDrawer should batch-resolve coffee bean thumbnails before passing beans into story screens'
);

console.log('coffee-bean list thumbnail usage tests passed');
