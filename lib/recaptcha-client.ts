export async function executeRecaptcha(action: string): Promise<string> {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? '';
  if (!siteKey) {
    throw new Error('Protection anti-robot indisponible. Réessayez plus tard.');
  }

  return new Promise((resolve, reject) => {
    const grecaptcha = window.grecaptcha;
    if (!grecaptcha) {
      reject(new Error('Protection anti-robot non chargée. Rechargez la page.'));
      return;
    }

    grecaptcha.ready(() => {
      grecaptcha
        .execute(siteKey, { action })
        .then(resolve)
        .catch(() => reject(new Error('Vérification anti-robot impossible.')));
    });
  });
}

export function recaptchaSiteKey(): string {
  return process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? '';
}
