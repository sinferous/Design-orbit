import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 1. Bypass static files, Next internals, assets, and APIs
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/logo') ||
    pathname === '/favicon.ico' ||
    pathname.match(/\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$/)
  ) {
    return NextResponse.next();
  }

  // 2. Read authenticated session cookie
  const authCookie = request.cookies.get('design_orbit_auth')?.value;
  let userSession: { name?: string; email?: string; profileId?: string; isAdmin?: boolean } | null = null;

  if (authCookie) {
    try {
      userSession = JSON.parse(decodeURIComponent(authCookie));
    } catch {
      userSession = null;
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  if (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('your-supabase-project')) {
    try {
      const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) =>
                request.cookies.set(name, value)
              );
              response = NextResponse.next({
                request,
              });
              cookiesToSet.forEach(({ name, value, options }) =>
                response.cookies.set(name, value, options)
              );
            },
          },
        }
      );
      await supabase.auth.getUser();
    } catch (err) {
      console.error('Supabase middleware check warning:', err);
    }
  }

  const isPublicRoute = pathname === '/login';
  const isRootRoute = pathname === '/';
  const isLoggedIn = Boolean(userSession?.name);

  // 3. Root URL handling: Route to appropriate dashboard or login
  if (isRootRoute) {
    if (isLoggedIn) {
      const target = userSession?.isAdmin ? '/admin' : '/dashboard';
      return NextResponse.redirect(new URL(target, request.url));
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 4. Unauthenticated Access Protection:
  // If user is NOT logged in and attempts to access ANY protected route (including /admin, /dashboard, /work, etc.)
  if (!isLoggedIn) {
    if (!isPublicRoute) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  // 5. Already logged in user accessing /login -> redirect to their dashboard
  if (isPublicRoute) {
    const target = userSession?.isAdmin ? '/admin' : '/dashboard';
    return NextResponse.redirect(new URL(target, request.url));
  }

  // 6. Admin Route Authorization Guard:
  // If user is accessing /admin but is NOT an administrator, redirect to /dashboard
  if (pathname.startsWith('/admin') && !userSession?.isAdmin) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
