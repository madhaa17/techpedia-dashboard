import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key"
);

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle preflight CORS request
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Handle CORS headers
  const response = NextResponse.next();
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Protect specific pages
  const protectedPaths = ["/dashboard", "/profile", "/admin"];

  const isProtectedPage = protectedPaths.some((path) =>
    pathname.startsWith(path)
  );

  if (isProtectedPage) {
    const token =
      request.cookies.get("token")?.value ||
      request.headers.get("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    try {
      await jwtVerify(token, JWT_SECRET);
    } catch (err) {
      console.error("Invalid token:", err);
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/api/:path*",
    "/dashboard/:path*",
    "/profile/:path*",
    "/admin/:path*",
  ],
};
