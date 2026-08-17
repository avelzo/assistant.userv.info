import { test, expect } from '@playwright/test';

const widths = [390, 768, 1024, 1440] as const;

for (const width of widths) {
  test(`landing utilisable à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 800 ? 844 : 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /trouvez les bons mots/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /commencer une démarche/i }).first()).toBeVisible();
    await expect(page.getByText(/la démarche à gauche, le courrier à droite/i)).toBeVisible();
    await expect(page.getByText(/de votre problème à un courrier prêt/i)).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    );
    expect(overflow).toBe(false);
  });
}
