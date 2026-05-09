'use client';

import { useEffect } from 'react';
import CrashRecoveryNotice from '@/components/common/feedback/CrashRecoveryNotice';
import {
  installCrashDiagnostics,
  recordCrashCheckpoint,
} from '@/lib/app/crashDiagnostics';

export default function CrashDiagnosticsProvider() {
  useEffect(() => {
    void installCrashDiagnostics();
    recordCrashCheckpoint('client:provider-mounted');
  }, []);

  return <CrashRecoveryNotice />;
}
