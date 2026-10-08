import { expect, test, type Page } from '@playwright/test';

async function designToScreen(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  const box = await page.locator('canvas').boundingBox();
  if (box === null) throw new Error('game canvas not found');
  return { x: box.x + (x / 1280) * box.width, y: box.y + (y / 720) * box.height };
}

async function sceneActive(page: Page, key: string): Promise<boolean> {
  return page.evaluate((k) => {
    const w = window as unknown as { __game?: { scene: { isActive(key: string): boolean } } };
    return w.__game?.scene.isActive(k) ?? false;
  }, key);
}

test('boots to hub, enters creation, shows Genesis 1:1', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();

  const begin = await designToScreen(page, 640, 360);
  await page.mouse.click(begin.x, begin.y);
  await expect.poll(() => sceneActive(page, 'HubScene')).toBe(true);

  const door = await designToScreen(page, 140, 420);
  await page.mouse.click(door.x, door.y);
  await expect.poll(() => sceneActive(page, 'CreationScene')).toBe(true);

  const verses = await page.evaluate(
    () => (window as unknown as { __witnessVerses?: string[] }).__witnessVerses,
  );
  expect(verses?.[0]).toBe('Genesis 1:1');
});
