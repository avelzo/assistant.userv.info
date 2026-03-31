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

test('la page generate charge le formulaire', async ({ page }) => {
  await page.goto('/generate');

  await expect(
    page.getByRole('heading', { name: /générer un courrier/i })
  ).toBeVisible();

  await expect(
    page.getByRole('button', { name: /générer ma lettre/i })
  ).toBeVisible();
});

test('affiche une erreur si le champ détails est vide', async ({ page }) => {
  await page.goto('/generate');

  await page.getByRole('button', { name: /générer ma lettre/i }).click();

  await expect(
    page.getByText(/veuillez décrire la situation/i)
  ).toBeVisible();
});