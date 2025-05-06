import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authAdminOnly } from "@/lib/middleware";

export async function GET(req: Request | NextRequest): Promise<NextResponse> {
  try {
    const brands = await prisma.brand.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        products: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: brands, success: true });
  } catch (error) {
    console.error("Error fetching brands:", error);
    return NextResponse.json(
      { error: "Failed to fetch brands", success: false },
      { status: 500 }
    );
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    // Check admin authorization
    const isAdmin = await authAdminOnly(req);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    const body = (await req.json()) as BrandCreateInput;

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: "Brand name is required" },
        { status: 400 }
      );
    }

    const brand = await prisma.brand.create({
      data: {
        name: body.name,
      },
    });

    return NextResponse.json(brand, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create brand", success: false },
      { status: 500 }
    );
  }
}
