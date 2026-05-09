'use client';

import { useEffect } from 'react';
import { initCapacitor } from '@/lib/app/capacitor';
import { initBrowserCompat } from '@/lib/app/browserCompat';
import { recordCrashCheckpoint } from '@/lib/app/crashDiagnostics';
import { useBackButtonExit } from '@/lib/hooks/useBackButtonExit';

export default function CapacitorInit() {
  // 使用双击返回键退出应用的功能
  useBackButtonExit();

  useEffect(() => {
    // 在客户端组件挂载后初始化 Capacitor
    recordCrashCheckpoint('client:capacitor-init:start');
    initCapacitor();

    // 初始化浏览器兼容性检测
    initBrowserCompat();
    recordCrashCheckpoint('client:capacitor-init:done');
  }, []);

  // 这个组件不渲染任何内容
  return null;
}
