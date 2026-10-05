import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/app.css';
import './styles/lectures.css';
import './styles/review.css';
import './styles/pages.css';
import { App } from './App';
import { getMeta, getSettings, setMeta } from './db/settings';
import { enableActiveStyles, loadHapticsSetting, requestPersistence } from './lib/device';
import { initRouter } from './lib/router';
import { checkForUpdate } from './lib/version';
import { ensureContent } from './content/load';
import { restore, setInitialRate } from './lectures/player';
import { lectureNow, startLectureCache } from './lectures/store';

async function boot() {
  initRouter();
  enableActiveStyles();
  await startLectureCache();
  const settings = await getSettings();
  await loadHapticsSetting();

  // Put the last lecture back in the mini-player (paused) if it was left unfinished.
  setInitialRate(settings.lectureRate);
  const last = await getMeta<number>('lastTrack');
  if (last && !lectureNow(last).done && lectureNow(last).position > 0) restore(last, settings.lectureRate);

  // First launch: ask iOS to keep the data safe from automatic deletion (Phase 0 check 6).
  if (!(await getMeta<number>('firstLaunchAt'))) {
    await setMeta('firstLaunchAt', Date.now());
    const granted = await requestPersistence();
    await setMeta('persistGranted', granted);
  }

  createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
  void checkForUpdate();
  void ensureContent();
}

void boot();
