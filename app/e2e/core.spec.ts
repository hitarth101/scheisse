import { expect, test, type Page } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';

// Screen checks in WebKit (Safari's engine) at iPhone 14 Pro size, run in light and dark (playwright.config.ts).

async function fresh(page: Page, hash = '#/flashcards') {
  await page.goto('./' + hash);
  await page.evaluate(async () => {
    localStorage.clear();
    await new Promise<void>(res => { const r = indexedDB.deleteDatabase('scheisse'); r.onsuccess = r.onerror = r.onblocked = () => res(); });
  });
  await page.goto('./' + hash);
  await page.reload();
}

async function noSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test('Flashcards opens with one green key and the tabs', async ({ page }) => {
  await fresh(page);
  await expect(page.getByRole('heading', { name: 'Flashcards' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Study' })).toBeVisible();
  await expect(page.locator('.go')).toHaveCount(1);
  await expect(page.getByRole('navigation', { name: 'Tabs' }).getByRole('link')).toHaveText(['Flashcards', 'Lectures', 'Reading', 'Grammar', 'Status']);
  await expect(page.locator('.statusbar-backdrop')).toHaveCount(1);
  await noSidewaysScroll(page);
});

test('Lectures lists all 50 tracks with their lengths', async ({ page }) => {
  await fresh(page, '#/lectures');
  await expect(page.getByRole('heading', { name: 'Lectures' })).toBeVisible();
  await expect(page.locator('.trk .cl')).toHaveCount(50);
  await expect(page.getByRole('button', { name: 'Lecture 09' })).toContainText('9:45');
  await expect(page.getByText('0 of 50 done')).toBeVisible();
  await noSidewaysScroll(page);
});

test('the player opens from the list and closes back to it', async ({ page }) => {
  await fresh(page, '#/lectures');
  await page.getByRole('button', { name: 'Lecture 09' }).click();
  const player = page.getByRole('dialog', { name: 'Player, lecture 09' });
  await expect(player).toBeVisible();
  await expect(player.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  await expect(player.getByRole('button', { name: 'Skip back 10 seconds' })).toBeVisible();
  await expect(player.getByRole('group', { name: 'Playback speed' }).getByRole('button')).toHaveText(['0.75×', '1×', '1.25×', '1.5×']);
  await player.getByRole('button', { name: '1.25×' }).click();
  await expect(player.getByRole('button', { name: '1.25×' })).toHaveAttribute('aria-pressed', 'true');
  await player.getByRole('button', { name: 'Close player' }).click();
  await expect(player).toBeHidden();
  await expect(page.getByTestId('mini-player')).toContainText('Lecture 09');
});

test('Mark done from the player marks the track done', async ({ page }) => {
  await fresh(page, '#/lectures');
  await page.getByRole('button', { name: 'Lecture 02' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Mark done' }).click();
  await page.getByRole('button', { name: 'Close player' }).click();
  await expect(page.getByText('1 of 50 done')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lecture 02, done' })).toBeVisible();
});

test('notes are saved as typed and survive closing the app', async ({ page }) => {
  await fresh(page, '#/lectures/08');
  await expect(page.getByRole('heading', { name: 'Lecture 08' })).toBeVisible();
  const notes = page.getByRole('textbox', { name: 'Notes for lecture 08' });
  await notes.fill('Ask the tutor about word order.');
  await page.waitForTimeout(700);
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Notes for lecture 08' })).toHaveValue('Ask the tutor about word order.');
});

test('backup exports a file and restores it after confirmation', async ({ page }, info) => {
  await fresh(page, '#/lectures/05');
  await page.getByRole('textbox', { name: 'Notes for lecture 05' }).fill('Note kept in the backup.');
  await page.waitForTimeout(700);

  await page.goto('./#/status');
  await expect(page.getByText('None yet')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /Export backup/ }).click();
  const file = await download;
  const path = info.outputPath('backup.json');
  await file.saveAs(path);
  const backup = JSON.parse(readFileSync(path, 'utf8'));
  expect(backup.app).toBe('Scheiße');
  expect(backup.tables.lectures.find((r: { track: number }) => r.track === 5).notes).toBe('Note kept in the backup.');
  await expect(page.getByText(/, today$/)).toBeVisible();

  // Change something, then restore: the change disappears and the backup's note returns.
  await page.goto('./#/lectures/05');
  await page.getByRole('textbox', { name: 'Notes for lecture 05' }).fill('Changed after the backup.');
  await page.waitForTimeout(700);
  await page.goto('./#/status');
  await page.getByTestId('restore-input').setInputFiles(path);
  const sheet = page.getByRole('dialog', { name: 'Restore from backup' });
  await expect(sheet.getByText('Replace everything with this backup?')).toBeVisible();
  await sheet.getByRole('button', { name: 'Replace with this backup' }).click();
  await expect(sheet).toBeHidden();
  await page.goto('./#/lectures/05');
  await expect(page.getByRole('textbox', { name: 'Notes for lecture 05' })).toHaveValue('Note kept in the backup.');
});

test('a file that is not a backup changes nothing', async ({ page }, info) => {
  await fresh(page, '#/status');
  const path = info.outputPath('other.json');
  writeFileSync(path, '{"hello":"world"}');
  await page.getByTestId('restore-input').setInputFiles(path);
  await expect(page.getByText("This file isn't a Scheiße backup")).toBeVisible();
  await expect(page.getByText('Nothing on this iPhone was changed.')).toBeVisible();
});

test('every key has a name for VoiceOver', async ({ page }) => {
  for (const hash of ['#/flashcards', '#/lectures', '#/lectures/01', '#/status', '#/status/settings']) {
    await page.goto('./' + hash);
    await page.waitForTimeout(200);
    const unnamed = await page.evaluate(() => Array.from(document.querySelectorAll('button, a, input'))
      .filter(el => !(el as HTMLElement).hidden && (el as HTMLInputElement).type !== 'file')
      .filter(el => !(el.getAttribute('aria-label') || el.textContent?.trim()))
      .map(el => el.outerHTML.slice(0, 80)));
    expect(unnamed, hash).toEqual([]);
  }
});
