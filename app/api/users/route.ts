import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authAdminOnly } from "@/lib/middleware";

// Get All User (Admin Only)
export async function GET(req: Request | NextRequest): Promise<NextResponse> {
  try {
    const isAdmin = await authAdminOnly(req);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    const url = new URL(req.url);

    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");

    const role = url.searchParams.get("role");
    const search = url.searchParams.get("search");

    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const total = await prisma.user.count({ where });

    const skip = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    const response: UserResponse = {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users", success: false },
      { status: 500 }
    );
  }
}
