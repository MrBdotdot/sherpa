import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "";

// Subdomains that belong to the studio app, not game experiences
const RESERVED = new Set(["www", "studio", "app"]);

export function proxy(request: NextRequest) {
  if (!BASE_DOMAIN) return NextResponse.next();

  const host = (request.headers.get("host") ?? "").replace(/:.*/, "");

  // Root domain or reserved subdomains — pass through
  if (host === BASE_DOMAIN || !host.endsWith(`.${BASE_DOMAIN}`)) {
    return NextResponse.next();
  }

  const subdomain = host.slice(0, -(`.${BASE_DOMAIN}`.length));

  if (!subdomain || RESERVED.has(subdomain)) return NextResponse.next();

  // Treat subdomain as a game ID — rewrite to the play route
  const url = request.nextUrl.clone();
  url.pathname = `/play/${subdomain}${request.nextUrl.pathname === "/" ? "" : request.nextUrl.pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
