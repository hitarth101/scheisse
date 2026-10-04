// Small iPhone-specific helpers, each proven in Phase 0.
import { getSetting } from '../db/settings';

/** Light tap feedback. iPhone gives websites a tick only by toggling a hidden switch control (Phase 0 check 11). */
let hapticLabel: HTMLLabelElement | null = null;
function ensureHaptic(): HTMLLabelElement {
  if (hapticLabel) return hapticLabel;
  const label = document.createElement('label');
  label.setAttribute('aria-hidden', 'true');
  label.style.cssText = 'position:absolute;left:-9999px;top:0;';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  input.tabIndex = -1;
  label.appendChild(input);
  document.body.appendChild(label);
  hapticLabel = label;
  return label;
}

let hapticsOn = true;
export function setHapticsEnabled(on: boolean) { hapticsOn = on; }
export async function loadHapticsSetting() { hapticsOn = await getSetting('haptics'); }

export function tick() {
  if (!hapticsOn) return;
  try { ensureHaptic().click(); } catch { /* never relied on */ }
}

/** Running from the home-screen icon (not a Safari tab). */
export function isStandalone(): boolean {
  return (navigator as Navigator & { standalone?: boolean }).standalone === true || matchMedia('(display-mode: standalone)').matches;
}

/** Ask iOS not to delete the app's data under storage pressure (granted in Phase 0). */
export async function requestPersistence(): Promise<boolean | null> {
  try {
    if (!navigator.storage?.persist) return null;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch { return null; }
}

/** Makes :active styles work on iPhone. */
export function enableActiveStyles() {
  document.addEventListener('touchstart', () => {}, { passive: true });
}
