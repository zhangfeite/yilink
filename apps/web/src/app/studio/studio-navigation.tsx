'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavigationItem {
  href: string;
  label: string;
}

export function StudioNavigation({ items }: { items: NavigationItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 lg:mt-10 lg:flex-col lg:gap-2" aria-label="Studio">
      {items.map((item) => {
        const active =
          item.href === '/studio' ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            aria-current={active ? 'page' : undefined}
            className={`rounded-control px-4 py-2.5 text-body font-semibold transition ${
              active
                ? 'bg-card text-ink shadow-card'
                : 'text-muted hover:bg-accent-soft hover:text-ink'
            }`}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
