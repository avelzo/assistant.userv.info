import Link from 'next/link';
import type { ReactNode } from 'react';

type HeroGenerateLinkProps = {
  className?: string;
  children?: ReactNode;
};

export function HeroGenerateLink({ className, children }: HeroGenerateLinkProps) {
  return (
    <Link href="/generate" className={className}>
      {children ?? 'Commencer une démarche'}
    </Link>
  );
}
