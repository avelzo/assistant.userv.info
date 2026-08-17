'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import { useCookieConsent } from '@/lib/cookies/consent';

export function AnalyticsScripts({ measurementId }: { measurementId: string }) {
  const enabled = Boolean(useCookieConsent()?.analytics);

  useEffect(() => {
    if (!enabled && typeof window.gtag === 'function') {
      window.gtag('consent', 'update', { analytics_storage: 'denied' });
    }
  }, [enabled]);

  if (!enabled) {
    return null;
  }

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />
      <Script id="gtag-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${measurementId}', { anonymize_ip: true, page_path: window.location.pathname });`}
      </Script>
    </>
  );
}
