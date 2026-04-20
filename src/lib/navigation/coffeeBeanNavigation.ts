export const COFFEE_BEAN_NAVIGATION_EVENTS = {
  SYNC_INVENTORY_CONTEXT: 'coffeeBeans:syncInventoryContext',
} as const;

export type CoffeeBeanInventoryState = 'green' | 'roasted';

export interface SyncCoffeeBeanInventoryContextDetail {
  beanState?: CoffeeBeanInventoryState;
  clearSearch?: boolean;
}
