import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  addNote: vi.fn(),
  increaseBeanRemaining: vi.fn(),
  updateBeanRemaining: vi.fn(),
}));

vi.mock('@/lib/stores/brewingNoteStore', () => ({
  useBrewingNoteStore: {
    getState: () => ({ addNote: mocks.addNote }),
  },
}));

vi.mock('@/lib/stores/coffeeBeanStore', () => ({
  increaseBeanRemaining: mocks.increaseBeanRemaining,
  updateBeanRemaining: mocks.updateBeanRemaining,
}));

import {
  applyCapacityAdjustmentDelta,
  revertCapacityAdjustmentRecord,
} from './capacityAdjustment';

describe('capacity adjustment inventory sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.increaseBeanRemaining.mockResolvedValue(null);
    mocks.updateBeanRemaining.mockResolvedValue(null);
  });

  it('applies positive and negative deltas through the shared inventory helpers', async () => {
    await applyCapacityAdjustmentDelta('bean-1', 5);
    await applyCapacityAdjustmentDelta('bean-1', -3);

    expect(mocks.increaseBeanRemaining).toHaveBeenCalledWith('bean-1', 5);
    expect(mocks.updateBeanRemaining).toHaveBeenCalledWith('bean-1', 3);
  });

  it('reverts a capacity adjustment by applying the opposite delta', async () => {
    await revertCapacityAdjustmentRecord({
      beanId: 'bean-1',
      changeRecord: {
        capacityAdjustment: {
          originalAmount: 10,
          newAmount: 14,
          changeAmount: 4,
          changeType: 'increase',
        },
      },
    });

    expect(mocks.updateBeanRemaining).toHaveBeenCalledWith('bean-1', 4);
  });
});
