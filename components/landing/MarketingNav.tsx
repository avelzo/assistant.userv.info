'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/comment-ca-marche', label: 'Comment ça marche' },
  { href: '/pricing', label: 'Tarifs' },
];

export function MarketingNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navigation principale" className="ml-6 hidden items-center gap-7 text-sm text-muted md:flex">
      {items.map((item) => {
        const current = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={current ? 'font-medium text-ink' : 'hover:text-ink'}
            aria-current={current ? 'page' : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
