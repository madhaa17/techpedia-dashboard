import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import {
  authAdminOnly,
  getCurrentUser,
  unauthorizedResponse,
} from "@/lib/middleware";
import { Role } from "@prisma/client";
import { stat } from "fs";

export async function POST(req: Request | NextRequest): Promise<NextResponse> {
  try {
    // check token exists
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return unauthorizedResponse();
    }

    // Verify that request is from an admin
    const isAdmin = await authAdminOnly(req);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    const body = (await req.json()) as CreateAdminRequest;

    // Validate required fields
    if (!body.name || !body.email || !body.password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: "Please provide a valid email address" },
        { status: 400 }
      );
    }

    // Password validation (stronger for admin)
    if (body.password.length < 8) {
      return NextResponse.json(
        { error: "Admin password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    // Check if email is already registered
    const existingUser = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(body.password, 12); // Higher rounds for admin

    // Create new admin user
    const newAdmin = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        password: hashedPassword,
        role: Role.ADMIN,
      },
    });

    // Create response with admin data (excluding password)
    const response: AdminResponse = {
      id: newAdmin.id,
      name: newAdmin.name,
      email: newAdmin.email,
      role: newAdmin.role,
      createdAt: newAdmin.createdAt,
    };

    return NextResponse.json({ data: response, success: true, status: 201 });
  } catch (error) {
    console.error("Admin creation error:", error);
    return NextResponse.json(
      { error: "Failed to create admin" },
      { status: 500 }
    );
  }
}

// Get all admins (admin only)
export async function GET(req: Request | NextRequest): Promise<NextResponse> {
  try {
    // check token exists
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return unauthorizedResponse();
    }

    // Verify that request is from an admin
    const isAdmin = await authAdminOnly(req);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    // Get all admin users
    const admins = await prisma.user.findMany({
      where: { role: Role.ADMIN },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: admins, success: true, status: 200 });
  } catch (error) {
    console.error("Error fetching admins:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin list" },
      { status: 500 }
    );
  }
}
