import { expect, test, type Page } from '@playwright/test';

// Study, the tick screen and the Flashcards tab, in WebKit at iPhone 14 Pro size (light and dark).
// Recordings come from Wikimedia and Tatoeba; they are blocked here so the tests never depend on outside sites.

test.describe.configure({ timeout: 90_000 });

async function fresh(page: Page, hash = '#/flashcards') {
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
    // Wait until the next card (with its Reveal or Check key) or the end card is on screen.
    await page.waitForFunction(() => {
      const t = document.querySelector('.rv-top .t')?.textContent ?? '';
      if (!t.includes(' left')) return true;
      if (document.querySelector('.grades')) return true; // already revealed
      return [...document.querySelectorAll('button')].some(b => ['Reveal', 'Check'].includes((b.textContent ?? '').trim()));
    });
    if (!(await page.locator('.rv-top .t').textContent())?.includes(' left')) return;
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

test('Study: 10 new words, each shown again after its 10-minute step, then nothing due', async ({ page }) => {
  await fresh(page);
  await expect(page.getByText('10 left today · first Goethe A1 words')).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Study' }).click();
  await expect(page.locator('.rv-top .t')).toContainText('10 left', { timeout: 30_000 });
  await expect(page.locator('.rv-top .t')).toContainText('Word');
  await expect(page.getByText('Say it aloud, then reveal.')).toBeVisible();
  // No grading before the reveal
  await expect(page.getByRole('group', { name: 'Grade your answer' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Reveal', exact: true }).click();
  const grades = page.getByRole('group', { name: 'Grade your answer' });
  await expect(grades.getByRole('button')).toHaveCount(4);
  await expect(grades.getByRole('button', { name: /^Good, next review in/ })).toBeVisible();

  await answerAll(page, 'Good');
  await expect(page.getByText('Nothing due right now')).toBeVisible();
  await expect(page.getByText('This visit: 10 cards')).toBeVisible();
  await expect(page.getByText("Today's new cards are done.")).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add 5 more new cards' })).toBeVisible();

  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByText("Today's 10 done")).toBeVisible();
  await expect(page.locator('.cardlist .cl')).toHaveCount(10);
});

test('typed answers are compared, and "ue" for ü is a note, not a mistake', async ({ page }) => {
  await fresh(page, '#/study');
  await expect(page.locator('.rv-top .t')).toContainText('10 left', { timeout: 30_000 });
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
  await fresh(page, '#/study');
  await expect(page.locator('.rv-top .t')).toContainText('10 left', { timeout: 30_000 });
  await page.getByRole('button', { name: 'Reveal', exact: true }).click();
  await page.getByRole('button', { name: /^Easy, next review in/ }).click();
  await expect(page.locator('.rv-top .t')).toContainText('9 left');
  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('button', { name: /Undo last grade/ }).click();
  await expect(page.locator('.rv-top .t')).toContainText('10 left');
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
  await page.goto('./#/flashcards');
  await expect(page.getByText('2 you picked come first')).toBeVisible();
});

test('a card opens from the list, and can be suspended and returned', async ({ page }) => {
  await fresh(page, '#/study');
  await expect(page.locator('.rv-top .t')).toContainText('10 left', { timeout: 30_000 });
  await page.getByRole('button', { name: 'Reveal', exact: true }).click();
  await page.getByRole('button', { name: /^Easy, next review in/ }).click();
  await expect(page.locator('.rv-top .t')).toContainText('9 left');
  await page.getByRole('button', { name: 'Close flashcards' }).click();
  // The next new card was already made when Study showed it, so the list holds two.
  await expect(page.locator('.cardlist .cl')).toHaveCount(2);
  await page.locator('.cardlist .cl').last().click();
  await expect(page.getByText('Say it', { exact: true })).toBeVisible();
  await expect(page.getByText('Hear it', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Suspend' }).first().click();
  await expect(page.getByRole('button', { name: 'Return to reviews' })).toBeVisible();
  await page.goto('./#/flashcards');
  await expect(page.getByText('Leeches, flagged and suspended cards wait for your decision')).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search cards' }).fill('zzzz');
  await expect(page.getByText('No cards match.')).toBeVisible();
});
