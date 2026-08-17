import Link from 'next/link';

const links = [
  { href: '/comment-ca-marche', label: 'Comment ça marche' },
  { href: '/pricing', label: 'Tarifs' },
  { href: '/contact', label: 'Contact' },
  { href: '/mentions-legales', label: 'Mentions légales' },
  { href: '/confidentialite', label: 'Confidentialité' },
  { href: '/cookies', label: 'Cookies' },
  { href: '/conditions', label: 'Conditions' },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-[1160px] flex-col gap-4 px-5 py-8 text-sm text-muted lg:px-8">
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <span className="font-serif font-medium text-ink">Assistant</span>
            <span>· Démarches et courriers</span>
          </div>
          <p className="text-center text-xs sm:text-right">
            Un accompagnement, jamais une décision à votre place.
          </p>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs sm:justify-start">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-ink">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
