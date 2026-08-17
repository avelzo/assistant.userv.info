import Link from 'next/link';

export function RecaptchaNotice() {
  return (
    <p className="text-[0.7rem] leading-5 text-muted">
      Ce formulaire est protégé par reCAPTCHA. Les{' '}
      <a
        href="https://policies.google.com/privacy"
        className="underline decoration-line underline-offset-2 hover:text-ink"
        target="_blank"
        rel="noreferrer"
      >
        règles de confidentialité
      </a>{' '}
      et{' '}
      <a
        href="https://policies.google.com/terms"
        className="underline decoration-line underline-offset-2 hover:text-ink"
        target="_blank"
        rel="noreferrer"
      >
        conditions
      </a>{' '}
      de Google s’appliquent. Voir aussi notre{' '}
      <Link href="/confidentialite" className="underline decoration-line underline-offset-2 hover:text-ink">
        politique de confidentialité
      </Link>
      .
    </p>
  );
}
