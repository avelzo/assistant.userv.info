import { test, expect } from '@playwright/test';

const email = process.env.E2E_EMAIL || '';
const password = process.env.E2E_PASSWORD || '';

test.describe('parcours dossier authentifié', () => {
  test.skip(!email || !password, 'Définir E2E_EMAIL et E2E_PASSWORD pour le parcours authentifié.');

  test('créer une démarche, ouvrir le dossier, passer Assistant → Document', async ({ page }) => {
    await page.goto('/auth/login?callbackUrl=/generate');
    await page.getByLabel(/adresse email/i).fill(email);
    await page.getByLabel(/mot de passe/i).fill(password);
    await page.getByRole('button', { name: /accéder à mon compte/i }).click();
    await page.waitForURL(/\/generate/);

    await page.getByPlaceholder(/850/i).fill(
      'Je veux récupérer les 850 € de dépôt de garantie que mon ancien propriétaire ne m’a toujours pas rendus.'
    );
    await page.getByPlaceholder(/nom, organisme/i).fill('SCI Martin');
    await page.getByPlaceholder(/dates, montants/i).fill(
      'Le bail s’est terminé le 30 juin 2026. J’ai remis les clés en main propre et je n’ai reçu aucun virement.'
    );
    await page.getByRole('button', { name: /créer mon dossier/i }).click();
    await page.waitForURL(/\/dossiers\/[a-f0-9]{24}/);

    await expect(page.getByText('Démarche')).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Document' }).click();
    await expect(page.getByRole('button', { name: 'Lettre' })).toBeVisible();
    await page.getByRole('button', { name: 'Assistant' }).click();
    await expect(page.getByRole('button', { name: /rédiger mon courrier/i })).toBeVisible();

    await page.goto('/dossiers');
    await expect(page.getByRole('heading', { name: /mes dossiers/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /ouvrir/i }).first()).toBeVisible();
    await expect(page.locator('a[href="/settings"]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /dupliquer/i }).first()).toBeVisible();
  });
});
