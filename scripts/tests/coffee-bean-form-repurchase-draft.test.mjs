import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const modalSource = readFileSync(
  'src/components/coffee-bean/Form/Modal.tsx',
  'utf8'
);
const repurchaseSource = readFileSync(
  'src/lib/utils/beanRepurchaseUtils.ts',
  'utf8'
);

assert.match(
  modalSource,
  /hasPersistedInitialBean/,
  'CoffeeBeanFormModal should distinguish persisted beans from id-less repurchase drafts'
);

assert.match(
  modalSource,
  /if \(!hasPersistedInitialBean\) \{\s*setHydratedInitialBean\(initialBean \|\| null\);\s*return;\s*\}/s,
  'CoffeeBeanFormModal should pass id-less repurchase drafts through without image-record hydration'
);

assert.match(
  repurchaseSource,
  /mergeBeanWithStoredImages/,
  'createRepurchaseBean should merge stored coffee bean images before copying the repurchase draft'
);

assert.match(
  repurchaseSource,
  /const sourceBean = bean\.id\s*\?\s*await mergeBeanWithStoredImages\(bean\)\s*:\s*bean;/s,
  'createRepurchaseBean should keep images when source beans are stripped in the store'
);

console.log('coffee-bean form repurchase draft tests passed');
