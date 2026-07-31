import { NextResponse, type NextRequest } from "next/server";

/**
 * Gate the whole dashboard behind HTTP Basic Auth.
 *
 * Why this exists: the dashboard shows real names of people from private WhatsApp
 * groups, so it must not be readable by anyone who finds the URL. Vercel's own
 * "Vercel Authentication" only protects production deployments on Pro, so on the
 * Hobby plan we do it in the app instead.
 *
 * Set DASHBOARD_USER / DASHBOARD_PASSWORD in the Vercel project env.
 * If DASHBOARD_PASSWORD is unset we FAIL CLOSED (503) rather than silently
 * serving personal data to the public.
 *
 * /api/* is excluded here and authenticated separately with a bearer token, so
 * the VPS can push stats without knowing the Basic Auth credentials.
 */
export function middleware(req: NextRequest) {
  const user = process.env.DASHBOARD_USER || "jaap";
  const password = process.env.DASHBOARD_PASSWORD;

  if (!password) {
    return new NextResponse(
      "Dashboard is not configured: DASHBOARD_PASSWORD is unset. Refusing to serve.",
      { status: 503 },
    );
  }

  const header = req.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const idx = decoded.indexOf(":");
      const given = { u: decoded.slice(0, idx), p: decoded.slice(idx + 1) };
      if (given.u === user && given.p === password) {
        return NextResponse.next();
      }
    } catch {
      // fall through to the challenge
    }
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Bansko Dashboard", charset="UTF-8"' },
  });
}

export const config = {
  // Everything except the push API (bearer-authenticated) and static assets.
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico).*)"],
};
