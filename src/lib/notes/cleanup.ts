import type { BrewingNote } from '@/lib/core/config';
import { db } from '@/lib/core/db';
import { recordCrashCheckpoint } from '@/lib/app/crashDiagnostics';

type LegacyBrewingNote = BrewingNote & {
  coffeeBean?: unknown;
};

export interface BrewingNoteCleanupStats {
  scannedCount: number;
  cleanedCount: number;
}

let cleanupPromise: Promise<BrewingNoteCleanupStats> | null = null;

export const stripEmbeddedCoffeeBeanFromNote = (
  note: BrewingNote
): { note: BrewingNote; changed: boolean } => {
  if (!Object.prototype.hasOwnProperty.call(note, 'coffeeBean')) {
    return { note, changed: false };
  }

  const cleanedNote = { ...(note as LegacyBrewingNote) };
  delete cleanedNote.coffeeBean;

  return { note: cleanedNote, changed: true };
};

export async function cleanupEmbeddedCoffeeBeansFromNotes(): Promise<BrewingNoteCleanupStats> {
  if (cleanupPromise) {
    return cleanupPromise;
  }

  cleanupPromise = runEmbeddedCoffeeBeanCleanup().catch(error => {
    cleanupPromise = null;
    throw error;
  });
  return cleanupPromise;
}

async function runEmbeddedCoffeeBeanCleanup(): Promise<BrewingNoteCleanupStats> {
  const stats: BrewingNoteCleanupStats = {
    scannedCount: 0,
    cleanedCount: 0,
  };

  await db.transaction('rw', db.brewingNotes, async () => {
    await db.brewingNotes.each(async note => {
      stats.scannedCount += 1;
      const cleaned = stripEmbeddedCoffeeBeanFromNote(note);

      if (!cleaned.changed) {
        return;
      }

      await db.brewingNotes.put(cleaned.note);
      stats.cleanedCount += 1;
    });
  });

  if (stats.cleanedCount > 0) {
    recordCrashCheckpoint('brewing-notes:embedded-beans-cleaned', {
      ...stats,
    });
  }

  return stats;
}
