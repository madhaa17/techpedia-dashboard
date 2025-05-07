import { authAdminOnly } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET /api/brands/:id
export async function GET(
  req: Request | NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;

    if (id === "") {
      return NextResponse.json(
        { error: "Brand ID is required" },
        { status: 400 }
      );
    }

    // Check if product exists
    const existingBrand = await prisma.brand.findUnique({
      where: { id: id },
    });

    if (!existingBrand) {
      return NextResponse.json({ error: "brand not found" }, { status: 404 });
    }

    const brand = await prisma.brand.findUnique({
      where: { id: id },
      include: {
        products: true,
      },
    });

    return NextResponse.json({ data: brand, success: true });
  } catch (error) {
    console.error("Error fetching brand:", error);
    return NextResponse.json(
      { error: "Failed to fetch brand", success: false },
      { status: 500 }
    );
  }
}

// PUT /api/brands/:id
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  try {
    const isAdmin = await authAdminOnly(req);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { error: "Brand ID is required" },
        { status: 400 }
      );
    }

    // Check if product exists
    const existingBrand = await prisma.brand.findUnique({
      where: { id: id },
    });

    if (!existingBrand) {
      return NextResponse.json({ error: "brand not found" }, { status: 404 });
    }

    const body = (await req.json()) as BrandCreateInput;

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: "Brand name is required" },
        { status: 400 }
      );
    }

    const brand = await prisma.brand.update({
      where: { id: id },
      data: {
        name: body.name,
      },
    });

    return NextResponse.json({ data: brand, success: true });
  } catch (error) {
    console.error("Error updating brand:", error);
    return NextResponse.json(
      { error: "Failed to update brand", success: false },
      { status: 500 }
    );
  }
}

// DELETE /api/brands/:id
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  try {
    const isAdmin = await authAdminOnly(req);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { error: "Brand ID is required" },
        { status: 400 }
      );
    }

    // Check if product exists
    const existingBrand = await prisma.brand.findUnique({
      where: { id: id },
    });

    if (!existingBrand) {
      return NextResponse.json({ error: "brand not found" }, { status: 404 });
    }

    // check if brand has products
    const hasProducts = await prisma.product.findMany({
      where: { brandId: id },
    });

    if (hasProducts.length > 0) {
      return NextResponse.json(
        { error: "brand has products" },
        { status: 400 }
      );
    }

    await prisma.brand.delete({
      where: { id: id },
    });

    return NextResponse.json({ message: "brand deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete brand" },
      { status: 500 }
    );
  }
}
