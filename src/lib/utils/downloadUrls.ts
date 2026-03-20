const GH_PROXY_PREFIX = 'https://gh-proxy.org/';
const GITHUB_RELEASES_BASE =
  'https://github.com/chuthree/brew-guide/releases/download';
const DESKTOP_DOWNLOAD_URL = 'https://chu3.top/brewguide';
const ONLINE_ANDROID_DOWNLOAD_URL =
  'https://gh-proxy.org/https://github.com/chuthree/brew-guide/releases/download/v1.0.0-online/BrewGuide-OL_1.0.0_android.apk';

const normalizeVersion = (version: string) => version.replace(/^v/i, '');

const buildGithubReleaseUrl = (tag: string, assetName: string) =>
  `${GH_PROXY_PREFIX}${GITHUB_RELEASES_BASE}/${tag}/${assetName}`;

export const getDesktopDownloadUrl = () => DESKTOP_DOWNLOAD_URL;

export const getOfflineIosDownloadUrl = (version: string) => {
  const normalizedVersion = normalizeVersion(version);
  return buildGithubReleaseUrl(
    `v${normalizedVersion}`,
    `BrewGuide_${normalizedVersion}_ios.ipa`
  );
};

export const getOfflineAndroidDownloadUrl = (version: string) => {
  const normalizedVersion = normalizeVersion(version);
  return buildGithubReleaseUrl(
    `v${normalizedVersion}`,
    `BrewGuide_${normalizedVersion}_android.apk`
  );
};

export const getOnlineAndroidDownloadUrl = () => ONLINE_ANDROID_DOWNLOAD_URL;
