import Link from 'next/link';
import { HeaderAuthButton } from '@/components/HeaderAuthButton';
import { CreditsBadge } from '@/components/CreditsBadge';
import { HeroGenerateLink } from '@/components/HeroGenerateLink';
import { MarketingNav } from '@/components/landing/MarketingNav';

type HeaderProps = {
  variant?: 'app' | 'marketing';
};

export function Header({ variant = 'app' }: HeaderProps) {
  const isMarketing = variant === 'marketing';

  return (
    <header className="no-print sticky top-0 z-50 border-b border-line/80 bg-ivory/90 backdrop-blur-md">
      <div
        className={`mx-auto flex w-full items-center gap-3 px-4 sm:px-6 lg:px-8 ${
          isMarketing ? 'h-16 max-w-[1160px]' : 'h-14 max-w-[1440px] py-2 sm:h-16'
        }`}
      >
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-paper sm:h-9 sm:w-9">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="font-serif text-[1.05rem] font-semibold leading-none tracking-tight text-ink">Assistant</p>
            <p className="mt-0.5 hidden text-[0.62rem] uppercase tracking-[0.16em] text-muted sm:block">
              Démarches et courriers
            </p>
          </div>
        </Link>

        {isMarketing ? <MarketingNav /> : null}

        <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
          <CreditsBadge />
          <HeaderAuthButton />
          {isMarketing ? (
            <HeroGenerateLink className="rounded-full bg-primary px-3.5 py-2 text-sm font-medium text-paper hover:bg-primary-hover sm:px-4">
              Commencer
            </HeroGenerateLink>
          ) : null}
        </div>
      </div>
    </header>
  );
}
