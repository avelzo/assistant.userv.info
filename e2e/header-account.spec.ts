import { test, expect } from '@playwright/test';

test.use({ hasTouch: true });

test.beforeEach(async ({ page }) => {
  // Session fictive : ces tests ne créent aucun compte ni donnée en base.
  await page.route('**/api/auth/get-session**', (route) => route.fulfill({
    json: {
      session: {
        id: 'header-test-session',
        userId: 'header-test-user',
        expiresAt: '2099-01-01T00:00:00.000Z',
      },
      user: {
        id: 'header-test-user',
        name: 'Camille',
        email: 'camille@example.test',
        emailVerified: true,
        role: 'user',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    },
  }));
  await page.route('**/api/credits/balance', (route) => route.fulfill({
    json: { freeCredits: 15, paidCredits: 0, totalCredits: 15 },
  }));
  await page.goto('/');
});

test('le menu du compte s’ouvre au toucher et se referme au second appui', async ({ page }) => {
  const button = page.getByRole('button', { name: /ouvrir le menu du compte/i });
  const menu = page.getByRole('navigation', { name: 'Menu du compte' });
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).toBeHidden();

  await button.tap();
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('link', { name: 'Mes dossiers' })).toHaveAttribute('href', '/dossiers');
  await expect(menu.getByRole('link', { name: 'Compte' })).toHaveAttribute('href', '/account');
  const bounds = await menu.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);

  await button.tap();
  await expect(menu).toBeHidden();
});

test('le menu du compte se ferme au toucher extérieur et avec Échap', async ({ page }) => {
  const button = page.getByRole('button', { name: /ouvrir le menu du compte/i });
  await button.tap();
  await page.getByRole('heading', { level: 1 }).tap();
  await expect(button).toHaveAttribute('aria-expanded', 'false');

  await button.tap();
  await page.keyboard.press('Escape');
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await expect(button).toBeFocused();
});
