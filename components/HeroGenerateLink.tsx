'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FREE_GENERATIONS, getUsedGenerations } from '@/lib/storage';

type HeroGenerateLinkProps = {
  className?: string;
};

export function HeroGenerateLink({ className }: HeroGenerateLinkProps) {
  const [hasFreeTrialLeft] = useState(() => {
    const usedGenerations = getUsedGenerations();
    return usedGenerations < FREE_GENERATIONS;
  });

  return (
    <Link href="/generate" className={className}>
      {hasFreeTrialLeft ? 'Générer ma lettre gratuitement' : 'Générer ma lettre'}
    </Link>
  );
}
