import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { db } from '@/lib/core/db';
import {
  createSettingsSyncFingerprint,
  uploadSettingsData,
} from './syncOperations';

vi.mock('@/lib/core/db', () => ({
  db: {
    appSettings: { get: vi.fn() },
    grinders: { toArray: vi.fn() },
  },
}));

const SETTINGS_SYNC_FINGERPRINT_KEY =
  'brew-guide:realtime-sync:settingsFingerprint';

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  clear(): void {
    this.values.clear();
  }
}

const localSettings = {
  username: '',
  textZoomLevel: 1.1,
  supabaseSync: {
    enabled: true,
    url: 'https://example.supabase.co',
    anonKey: 'anon-key',
    lastConnectionSuccess: true,
  },
  activeSyncType: 'supabase',
};

const localGrinders = [{ id: 'grinder-1', name: 'C40' }];

function mockLocalSettings() {
  vi.mocked(db.appSettings.get).mockResolvedValue({
    id: 'main',
    data: localSettings as any,
  });
  vi.mocked(db.grinders.toArray).mockResolvedValue(localGrinders as any);
}

function createSettingsClient(remoteData?: Record<string, unknown>) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: remoteData ? { data: remoteData } : null,
    error: null,
  });
  const eqId = vi.fn(() => ({ maybeSingle }));
  const eqUser = vi.fn(() => ({ eq: eqId }));
  const select = vi.fn(() => ({ eq: eqUser }));
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn(() => ({ select, upsert }));

  return {
    client: { from } as unknown as SupabaseClient,
    maybeSingle,
    select,
    upsert,
  };
}

describe('settings sync fingerprint', () => {
  beforeEach(() => {
    const storage = new MemoryStorage();
    Object.defineProperty(globalThis, 'localStorage', {
      value: storage,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'window', {
      value: { localStorage: storage },
      configurable: true,
    });
    vi.clearAllMocks();
  });

  it('uses stable object ordering and ignores volatile Supabase connection flags', () => {
    const first = createSettingsSyncFingerprint({
      b: 2,
      appSettings: {
        supabaseSync: {
          url: 'u',
          anonKey: 'k',
          lastConnectionSuccess: true,
          lastSyncTime: 123,
        },
        a: 1,
      },
    });
    const second = createSettingsSyncFingerprint({
      appSettings: {
        a: 1,
        supabaseSync: {
          lastConnectionSuccess: false,
          lastSyncTime: 456,
          anonKey: 'k',
          url: 'u',
        },
      },
      b: 2,
    });

    expect(first).toBe(second);
  });

  it('skips upload when the local fingerprint was already synced', async () => {
    mockLocalSettings();
    const localData = {
      appSettings: localSettings,
      grinders: localGrinders,
    };
    localStorage.setItem(
      SETTINGS_SYNC_FINGERPRINT_KEY,
      createSettingsSyncFingerprint(localData)
    );
    const { client, select, upsert } = createSettingsClient();

    const result = await uploadSettingsData(client, {
      skipIfUnchanged: true,
    });

    expect(result).toMatchObject({ success: true, affectedCount: 0 });
    expect(select).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it('skips upload when remote settings already match local data', async () => {
    mockLocalSettings();
    const localData = {
      appSettings: localSettings,
      grinders: localGrinders,
    };
    const { client, maybeSingle, upsert } = createSettingsClient(localData);

    const result = await uploadSettingsData(client, {
      skipIfUnchanged: true,
    });

    expect(result).toMatchObject({ success: true, affectedCount: 0 });
    expect(maybeSingle).toHaveBeenCalledTimes(1);
    expect(upsert).not.toHaveBeenCalled();
    expect(localStorage.getItem(SETTINGS_SYNC_FINGERPRINT_KEY)).toBe(
      createSettingsSyncFingerprint(localData)
    );
  });

  it('uploads settings when remote data differs from local data', async () => {
    mockLocalSettings();
    const { client, upsert } = createSettingsClient({
      appSettings: { ...localSettings, textZoomLevel: 1 },
      grinders: localGrinders,
    });

    const result = await uploadSettingsData(client, {
      skipIfUnchanged: true,
    });

    expect(result).toMatchObject({ success: true, affectedCount: 2 });
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert.mock.calls[0][0]).toMatchObject({
      id: 'app_settings',
      user_id: 'default_user',
      data: {
        appSettings: localSettings,
        grinders: localGrinders,
      },
    });
  });
});
