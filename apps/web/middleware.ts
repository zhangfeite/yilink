import { NextResponse } from 'next/server';

import { auth } from './src/lib/auth';

function normalizedHostname(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  const withoutProtocol = trimmed.replace(/^https?:\/\//i, '');
  return withoutProtocol.split('/')[0]?.split(':')[0]?.toLowerCase();
}

export default auth((request) => {
  const pathname = request.nextUrl.pathname;
  const pagesHost = normalizedHostname(process.env.PAGES_HOST);
  const requestHost = normalizedHostname(request.headers.get('host'));

  if (pagesHost && requestHost === pagesHost) {
    if (pathname === '/') {
      return NextResponse.rewrite(new URL('/p/_home', request.url));
    }

    const slugMatch = pathname.match(/^\/([^/]+)\/?$/);
    if (slugMatch) {
      return NextResponse.rewrite(new URL('/p/' + encodeURIComponent(slugMatch[1]), request.url));
    }

    return new NextResponse('Not Found', { status: 404 });
  }

  if (pathname.startsWith('/studio') && !request.auth) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
