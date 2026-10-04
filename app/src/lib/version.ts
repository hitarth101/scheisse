// After an update is published, the app notices on launch and reloads itself once (build plan section 3),
// so the owner never has to reinstall. GitHub Pages caches pages for about 10 minutes; loading the
// new address with ?v=<build> skips that cache.

declare const __BUILD_ID__: string;
export const BUILD_ID: string = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev';

const KEY = 'scheisse.reloadedFor';

export async function checkForUpdate(): Promise<void> {
  if (import.meta.env.DEV) return;
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}version.json?ts=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return;
    const { build } = (await res.json()) as { build?: string };
    if (!build || build === BUILD_ID) return;
    // Reload at most once per new build, so a stale cache can never cause a loop.
    if (sessionStorage.getItem(KEY) === build) return;
    sessionStorage.setItem(KEY, build);
    location.replace(`${location.pathname}?v=${encodeURIComponent(build)}${location.hash}`);
  } catch { /* offline or blocked: keep running the current version */ }
}
