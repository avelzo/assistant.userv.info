declare module '*.css';

interface Grecaptcha {
  ready: (callback: () => void) => void;
  execute: (siteKey: string, options: { action: string }) => Promise<string>;
}

interface Window {
  grecaptcha?: Grecaptcha;
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
}