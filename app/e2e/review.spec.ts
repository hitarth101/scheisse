import { expect, test, type Page } from '@playwright/test';

// Review, the tick screen and Today, in WebKit at iPhone 14 Pro size (light and dark).
// Recordings come from Wikimedia and Tatoeba; they are blocked here so the tests never depend on outside sites.

test.describe.configure({ timeout: 90_000 });

async function fresh(page: Page, hash = '#/today') {
  await page.route(/upload\.wikimedia\.org|tatoeba\.org/, r => r.abort());
  await page.goto('./' + hash);
  await page.evaluate(async () => {
    localStorage.clear();
    await new Promise<void>(res => { const r = indexedDB.deleteDatabase('scheisse'); r.onsuccess = r.onerror = r.onblocked = () => res(); });
  });
  await page.goto('./' + hash);
  await page.reload();
}

async function answerAll(page: Page, grade: 'Good' | 'Easy') {
  for (let i = 0; i < 40; i++) {
    // Wait until the next card (with its Reveal or Check key) or the block summary is on screen.
    await page.waitForFunction(() => {
      const t = document.querySelector('.rv-top .t')?.textContent ?? '';
      if (!t.includes(' of ')) return true;
      if (document.querySelector('.grades')) return true; // already revealed
      return [...document.querySelectorAll('button')].some(b => ['Reveal', 'Check'].includes((b.textContent ?? '').trim()));
    });
    if (!(await page.locator('.rv-top .t').textContent())?.includes(' of ')) return;
    if (!(await page.locator('.grades').count())) {
      const reveal = page.getByRole('button', { name: 'Reveal', exact: true });
      if (await reveal.count()) await reveal.click();
      else await page.getByRole('button', { name: 'Check', exact: true }).click();
    }
    await page.getByRole('button', { name: new RegExp(`^${grade}, next review in`) }).click();
    // The next card always starts unrevealed, so the grading keys disappear once it is on screen.
    await expect(page.locator('.grades')).toHaveCount(0);
  }
}

test('first session: 10 new words, each shown again after its 10-minute step, then the lecture', async ({ page }) => {
  await fresh(page);
  await expect(page.getByText('10 · first Goethe A1 words')).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Start session' }).click();
  await expect(page.locator('.rv-top .t')).toContainText('1 of 10', { timeout: 30_000 });
  await expect(page.locator('.rv-top .t')).toContainText('Word');
  await expect(page.getByText('Say it aloud, then reveal.')).toBeVisible();
  // No grading before the reveal
  await expect(page.getByRole('group', { name: 'Grade your answer' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Reveal', exact: true }).click();
  const grades = page.getByRole('group', { name: 'Grade your answer' });
  await expect(grades.getByRole('button')).toHaveCount(4);
  await expect(grades.getByRole('button', { name: /^Good, next review in/ })).toBeVisible();

  await answerAll(page, 'Good');
  await expect(page.getByText('New cards done')).toBeVisible();
  await expect(page.getByText('10 new cards')).toBeVisible();
  await expect(page.getByRole('button', { name: /Continue: Lecture 01/ })).toBeVisible();

  await page.goto('./#/today');
  await expect(page.getByText('10 done')).toBeVisible();
  await expect(page.getByRole('button', { name: /Continue: Lecture 01/ })).toBeVisible();
});

test('typed answers are compared, and "ue" for ü is a note, not a mistake', async ({ page }) => {
  await fresh(page);
  await page.getByRole('button', { name: 'Start session' }).click();
  await expect(page.locator('.rv-top .t')).toContainText('1 of 10', { timeout: 30_000 });
  await page.getByRole('button', { name: 'Type', exact: true }).click();
  const field = page.getByRole('textbox', { name: 'Your answer in German' });
  await expect(field).toBeVisible();
  await field.fill('xyz');
  await field.press('Enter');
  await expect(page.getByText('You typed')).toBeVisible();
  await expect(page.locator('.diff .x, .diff .miss').first()).toBeVisible();
  await expect(page.getByRole('group', { name: 'Grade your answer' })).toBeVisible();
});

test('Undo puts the last grade back', async ({ page }) => {
  await fresh(page);
  await page.getByRole('button', { name: 'Start session' }).click();
  await expect(page.locator('.rv-top .t')).toContainText('1 of 10', { timeout: 30_000 });
  await page.getByRole('button', { name: 'Reveal', exact: true }).click();
  await page.getByRole('button', { name: /^Easy, next review in/ }).click();
  await expect(page.locator('.rv-top .t')).toContainText('2 of 10');
  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('button', { name: /Undo last grade/ }).click();
  await expect(page.locator('.rv-top .t')).toContainText('1 of 10');
});

test('the tick screen turns ticked transcript pairs into cards', async ({ page }) => {
  await fresh(page, '#/lectures/03/sentences');
  await expect(page.getByRole('heading', { name: 'Sentences from this track' })).toBeVisible();
  const ticks = page.getByRole('checkbox');
  await expect(ticks.first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tick the pairs you heard' })).toBeDisabled();
  await ticks.nth(0).click();
  await ticks.nth(1).click();
  await expect(ticks.nth(0)).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: 'Add 2 cards' }).click();
  await expect(page.getByText('Added 2 cards')).toBeVisible();
  await page.goto('./#/lectures/03/sentences');
  await expect(page.getByRole('button', { name: '2 already added' })).toBeVisible();
});

test('Reviews only with nothing due says so plainly', async ({ page }) => {
  await fresh(page, '#/review?only=reviews');
  await expect(page.getByText('Nothing due right now')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: 'Back to Today' })).toBeVisible();
});

test('Leeches and Flagged lists are empty to start', async ({ page }) => {
  await fresh(page, '#/status/leeches');
  await expect(page.getByRole('heading', { name: 'Leeches' })).toBeVisible();
  await expect(page.getByText('None right now.')).toBeVisible();
});
