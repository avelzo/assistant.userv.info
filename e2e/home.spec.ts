import { test, expect } from '@playwright/test';

test('la page d’accueil charge correctement', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: /rédigez vos courriers/i })
  ).toBeVisible();

  await expect(
    page.getByRole('link', { name: /générer ma lettre gratuitement/i })
  ).toBeVisible();
});

test('la page generate redirige vers la connexion si non authentifié', async ({ page }) => {
  await page.goto('/generate');

  await expect(page).toHaveURL(/\/auth\/login/);

  await expect(
    page.getByRole('heading', { name: /connexion/i })
  ).toBeVisible();

  await expect(
    page.getByRole('button', { name: /accéder à mon compte/i })
  ).toBeVisible();
});

test('la page generate n’affiche pas le formulaire en étant non authentifié', async ({ page }) => {
  await page.goto('/generate');

  await expect(page).toHaveURL(/\/auth\/login/);

  await expect(
    page.getByRole('heading', { name: /connexion/i })
  ).toBeVisible();

  await expect(
    page.getByRole('button', { name: /générer ma lettre/i })
  ).toHaveCount(0);
});