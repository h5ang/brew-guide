import Dexie from 'dexie';
import { db } from '@/lib/core/db';
import type { BrewingNote } from '@/lib/core/config';

export async function getRelatedNotesForBean(
  beanId: string
): Promise<BrewingNote[]> {
  return db.brewingNotes
    .where('[beanId+timestamp]')
    .between([beanId, Dexie.minKey], [beanId, Dexie.maxKey])
    .reverse()
    .toArray();
}

export async function getBrewingNoteById(
  noteId: string
): Promise<BrewingNote | undefined> {
  return db.brewingNotes.get(noteId);
}

export async function getBrewingNotes(): Promise<BrewingNote[]> {
  return db.brewingNotes.toArray();
}
