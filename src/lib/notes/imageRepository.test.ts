import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BrewingNote } from '@/lib/core/config';
import type {
  BrewingNoteImageRecord,
  BrewingNoteImageThumbnailRecord,
} from './imageRecords';

const mocks = vi.hoisted(() => {
  const notes = new Map<string, BrewingNote>();
  const images = new Map<string, BrewingNoteImageRecord>();
  const thumbnails = new Map<string, BrewingNoteImageThumbnailRecord>();

  const table = <T extends object>(records: Map<string, T>, key: keyof T) => ({
    get: vi.fn((id: string) => Promise.resolve(records.get(id))),
    put: vi.fn((record: T) => {
      records.set(String(record[key]), record);
      return Promise.resolve();
    }),
    bulkPut: vi.fn((nextRecords: T[]) => {
      nextRecords.forEach(record => records.set(String(record[key]), record));
      return Promise.resolve();
    }),
    bulkGet: vi.fn((ids: string[]) =>
      Promise.resolve(ids.map(id => records.get(id)))
    ),
    delete: vi.fn((id: string) => {
      records.delete(id);
      return Promise.resolve();
    }),
    bulkDelete: vi.fn((ids: string[]) => {
      ids.forEach(id => records.delete(id));
      return Promise.resolve();
    }),
    clear: vi.fn(() => {
      records.clear();
      return Promise.resolve();
    }),
    count: vi.fn(() => Promise.resolve(records.size)),
    toCollection: vi.fn(() => ({
      primaryKeys: vi.fn(() => Promise.resolve(Array.from(records.keys()))),
    })),
    where: vi.fn(() => ({
      anyOf: (ids: string[]) => ({
        primaryKeys: vi.fn(() =>
          Promise.resolve(ids.filter(id => records.has(id)))
        ),
      }),
    })),
  });

  return {
    notes,
    images,
    thumbnails,
    db: {
      brewingNotes: table(notes, 'id'),
      brewingNoteImages: table(images, 'noteId'),
      brewingNoteImageThumbnails: table(thumbnails, 'noteId'),
      transaction: vi.fn(async (...args: unknown[]) => {
        const callback = args[args.length - 1] as () => Promise<void>;
        await callback();
      }),
    },
  };
});

vi.mock('@/lib/core/db', () => ({ db: mocks.db }));

import {
  getBrewingNoteImageCounts,
  getBrewingNoteImageNoteIds,
  getBrewingNoteImages,
  replaceBrewingNotesWithSplitImages,
} from './imageRepository';

const baseNote: BrewingNote = {
  id: 'note-1',
  timestamp: 1,
  rating: 0,
  taste: {},
  notes: '',
};

describe('brewing note image repository', () => {
  beforeEach(() => {
    mocks.notes.clear();
    mocks.images.clear();
    mocks.thumbnails.clear();
    vi.clearAllMocks();
  });

  it('finds note image ids from original records only', async () => {
    mocks.images.set('image-only', {
      noteId: 'image-only',
      image: 'original',
      updatedAt: 1,
    });
    mocks.thumbnails.set('thumbnail-only', {
      noteId: 'thumbnail-only',
      imageThumbnail: 'thumbnail',
      updatedAt: 1,
    });

    await expect(getBrewingNoteImageNoteIds()).resolves.toEqual(['image-only']);
  });

  it('returns original images without generating thumbnails', async () => {
    mocks.images.set('note-1', {
      noteId: 'note-1',
      image: 'original',
      images: ['original'],
      updatedAt: 1,
    });

    await expect(getBrewingNoteImages('note-1')).resolves.toEqual(['original']);
    expect(mocks.thumbnails.has('note-1')).toBe(false);
  });

  it('returns stored image counts for list placeholders', async () => {
    mocks.images.set('note-1', {
      noteId: 'note-1',
      image: 'front',
      images: ['front', 'back'],
      updatedAt: 1,
    });

    await expect(
      getBrewingNoteImageCounts(['note-1', 'missing'])
    ).resolves.toEqual(new Map([['note-1', 2]]));
  });

  it('preserves stored images when replacing lightweight notes', async () => {
    mocks.images.set('note-1', {
      noteId: 'note-1',
      image: 'original',
      images: ['original'],
      updatedAt: 1,
    });

    await replaceBrewingNotesWithSplitImages([{ ...baseNote, timestamp: 2 }]);

    expect(mocks.images.get('note-1')?.image).toBe('original');
  });
});
