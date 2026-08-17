import { test, expect } from '@playwright/test';

test('la page d’accueil charge correctement', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /trouvez les bons mots/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /commencer une démarche/i }).first()).toBeVisible();
  await expect(page.getByText(/vous avez une démarche à faire/i)).toBeVisible();
  await expect(page.getByText(/commencez par votre problème, pas par un modèle de courrier/i)).toBeVisible();
  await expect(page.locator('a[href="/settings"]')).toHaveCount(0);
});

test('aucune overflow horizontale à 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow).toBe(false);
});

test('la page generate redirige vers la connexion si non authentifié', async ({ page }) => {
  await page.goto('/generate');
  await expect(page).toHaveURL(/\/auth\/login/);
  await expect(page.getByRole('heading', { name: /connexion/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /accéder à mon compte/i })).toBeVisible();
});

test('Mes dossiers redirige vers la connexion si non authentifié', async ({ page }) => {
  await page.goto('/dossiers');
  await expect(page).toHaveURL(/\/auth\/login/);
});

test('le pied de page expose les pages légales', async ({ page }) => {
  await page.goto('/');
  const essentials = page.getByRole('button', { name: /essentiels seulement/i });
  if (await essentials.isVisible()) {
    await essentials.click();
  }
  await expect(page.locator('footer a[href="/mentions-legales"]')).toBeVisible();
  await expect(page.locator('footer a[href="/confidentialite"]')).toBeVisible();
  await expect(page.locator('footer a[href="/cookies"]')).toBeVisible();
  await expect(page.locator('footer a[href="/conditions"]')).toBeVisible();
});

test('les pages légales se chargent', async ({ page }) => {
  await page.goto('/mentions-legales');
  await expect(page.getByRole('heading', { name: /mentions légales/i })).toBeVisible();
  await page.goto('/confidentialite');
  await expect(page.getByRole('heading', { name: /politique de confidentialité/i })).toBeVisible();
  await page.goto('/cookies');
  await expect(page.getByRole('heading', { name: /politique cookies/i })).toBeVisible();
  await page.goto('/conditions');
  await expect(page.getByRole('heading', { name: /conditions générales/i })).toBeVisible();
});

test('le header mène aux pages Comment ça marche et Tarifs', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: /navigation principale/i }).getByRole('link', { name: /comment ça marche/i }).click();
  await expect(page).toHaveURL(/\/comment-ca-marche/);
  await expect(page.getByRole('heading', { name: /de votre problème à un courrier prêt/i })).toBeVisible();

  await page.getByRole('navigation', { name: /navigation principale/i }).getByRole('link', { name: /^tarifs$/i }).click();
  await expect(page).toHaveURL(/\/pricing/);
  await expect(page.getByRole('heading', { name: /choisissez un pack de crédits/i })).toBeVisible();
  await expect(page).not.toHaveURL(/\/auth\/login/);
  await expect(page.getByRole('button', { name: /30 crédits/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /80 crédits/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /200 crédits/i })).toBeVisible();
});

test('la page generate n’affiche pas le briefing en étant non authentifié', async ({ page }) => {
  await page.goto('/generate');
  await expect(page).toHaveURL(/\/auth\/login/);
  await expect(page.getByRole('button', { name: /créer mon dossier/i })).toHaveCount(0);
});

