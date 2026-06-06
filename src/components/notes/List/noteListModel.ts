import type { BrewingNote } from '@/lib/core/config';
import type { SettingsOptions } from '@/components/settings/Settings';

export const shouldHideNoteInList = (
  note: BrewingNote,
  settings?: SettingsOptions
): boolean =>
  note.source === 'capacity-adjustment' &&
  !(settings?.showCapacityAdjustmentRecords ?? true);

export const isChangeRecordNote = (
  note: BrewingNote,
  settings?: SettingsOptions
): boolean => {
  if (shouldHideNoteInList(note, settings)) {
    return false;
  }

  return (
    note.source === 'quick-decrement' ||
    note.source === 'capacity-adjustment' ||
    note.source === 'roasting'
  );
};
