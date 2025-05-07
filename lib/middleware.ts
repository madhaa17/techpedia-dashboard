// lib/auth-middleware.ts
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

// Define JWT payload interface
interface JwtPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

/**
 * Authentication middleware to verify JWT token
 * @param req - Request object
 * @returns User object if authenticated, null otherwise
 */
export async function auth(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.split(" ")[1];

    const invalidToken = await prisma.invalidToken.findUnique({
      where: { token },
    });

    if (invalidToken) {
      return null;
    }

    const decoded = jwt?.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  } catch (error) {
    console.error("Authentication error:", error);
    return null;
  }
}

/**
 * Middleware to verify if user is authenticated
 * @param req - Request object
 * @returns Boolean indicating if user is authenticated
 */
export async function authUser(req: Request) {
  const user = await auth(req);
  return user !== null;
}

/**
 * Middleware to verify if user is an admin
 * @param req - Request object
 * @returns Boolean indicating if user is an admin
 */
export async function authAdminOnly(req: Request) {
  const user = await auth(req);
  return user !== null && user.role === Role.ADMIN;
}

/**
 * Get current user information
 * @param req - Request object
 * @returns User object or null
 */
export async function getCurrentUser(req: Request) {
  return await auth(req);
}

/**
 * Error response for unauthorized access
 * @returns NextResponse with 401 status
 */
export function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
