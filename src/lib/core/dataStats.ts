import { db } from '@/lib/core/db';

export async function hasCoffeeBeans(): Promise<boolean> {
  return (await db.coffeeBeans.count()) > 0;
}

export async function hasEnoughCoffeeBeans(minCount: number): Promise<boolean> {
  return (await db.coffeeBeans.count()) >= minCount;
}

export async function hasBrewingNotes(): Promise<boolean> {
  return (await db.brewingNotes.count()) > 0;
}

export async function hasSignificantUserData(
  minCount: number
): Promise<boolean> {
  const [notesCount, beansCount, equipmentsCount] = await Promise.all([
    db.brewingNotes.count(),
    db.coffeeBeans.count(),
    db.customEquipments.count(),
  ]);

  return notesCount + beansCount + equipmentsCount >= minCount;
}
