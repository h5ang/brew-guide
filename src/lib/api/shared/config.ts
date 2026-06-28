const DEFAULT_API_BASE_URL = 'https://coffee.chu3.top';

export const API_CONFIG = {
  // 默认走线上 EdgeOne Functions，离线原生包可直接使用识别能力。
  baseURL: (process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_BASE_URL).replace(
    /\/+$/,
    ''
  ),
  timeoutMs: 120000,
} as const;
