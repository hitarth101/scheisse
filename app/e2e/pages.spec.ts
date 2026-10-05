import { expect, test, type Page } from '@playwright/test';

// The tabs added after Phase 1: Inbox (inside Flashcards), Grammar, Reading, Status. WebKit, iPhone 14 Pro size.

test.describe.configure({ timeout: 60_000 });

async function fresh(page: Page, hash: string) {
  await page.route(/upload\.wikimedia\.org|tatoeba\.org/, r => r.abort());
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

test('a captured phrase is saved, checked, and waits in the Inbox', async ({ page }) => {
  await fresh(page, '#/flashcards');
  await expect(page.getByText('10 left today · first Goethe A1 words')).toBeVisible({ timeout: 30_000 }); // word data loaded
  await page.getByRole('button', { name: 'Capture a phrase' }).click();
  await page.getByRole('textbox', { name: 'Phrase you heard' }).fill('Xyzzy plugh');
  await page.getByRole('textbox', { name: 'What were you watching? (optional)' }).fill('Dark, S1E3');
  await page.getByRole('button', { name: 'Save to Inbox' }).click();
  // Back where Capture was opened from, with the phrase waiting.
  await expect(page.getByText('1 phrase heard on TV to check')).toBeVisible();
  await page.getByRole('button', { name: /^Inbox/ }).click();
  await expect(page.getByText('Xyzzy plugh')).toBeVisible();
  await expect(page.getByText(/No source translation · ask your tutor · Dark, S1E3/)).toBeVisible();
});

test('grammar tables fit the phone width', async ({ page }) => {
  await fresh(page, '#/grammar');
  await page.getByRole('button', { name: 'Tables', exact: true }).click();
  for (const name of ['Definite articles', 'Possessive words', 'Adjective endings', 'Present tense']) {
    await page.getByRole('button', { name: new RegExp(`^${name}`) }).click();
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
    await noSidewaysScroll(page);
    await page.getByRole('button', { name: 'Grammar' }).first().click();
  }
});

test('outside time is added to the week on Status', async ({ page }) => {
  await fresh(page, '#/status');
  await page.getByRole('button', { name: 'Add outside time' }).click();
  const sheet = page.getByRole('dialog', { name: 'Add outside time' });
  await sheet.getByRole('button', { name: '5 minutes more' }).click();
  await sheet.getByRole('button', { name: 'Add 35 min' }).click();
  await expect(page.getByText('Outside the app')).toBeVisible();
  await expect(page.locator('.cl', { hasText: 'Outside the app' })).toContainText('35 min');
  await noSidewaysScroll(page);
});

test('every key on the new pages has a name for VoiceOver', async ({ page }) => {
  for (const hash of ['#/flashcards/inbox', '#/flashcards/inbox/capture', '#/grammar', '#/grammar/topics/a1-articles-definite', '#/grammar/tables/definite-articles', '#/reading', '#/reading/heidi-1-01', '#/status/dictionaries']) {
    await page.goto('./' + hash);
    await page.waitForTimeout(400);
    const unnamed = await page.evaluate(() => Array.from(document.querySelectorAll('button, a, input, [role="button"]'))
      .filter(el => !(el as HTMLElement).hidden && (el as HTMLInputElement).type !== 'file')
      .filter(el => !(el.getAttribute('aria-label') || el.textContent?.trim()))
      .map(el => el.outerHTML.slice(0, 80)));
    expect(unnamed, hash).toEqual([]);
    await noSidewaysScroll(page);
  }
});

test('reading: a sentence shows its English, a word in it opens its popup', async ({ page }) => {
  await fresh(page, '#/reading');
  await expect(page.getByRole('heading', { name: 'Reading' })).toBeVisible();
  await page.getByRole('button', { name: /^Hänsel und Gretel/ }).click();
  const first = page.locator('.text .s').first();
  await first.click();
  await expect(page.locator('.en-line, .para-en').first()).toBeVisible();
  await first.locator('.w').nth(3).click();
  const popup = page.getByRole('dialog');
  await expect(popup).toBeVisible();
  await expect(popup.getByRole('button', { name: 'Dictionary' })).toBeVisible();
  await noSidewaysScroll(page);
});
