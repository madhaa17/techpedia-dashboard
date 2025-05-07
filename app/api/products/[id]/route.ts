import {
  authAdminOnly,
  getCurrentUser,
  unauthorizedResponse,
} from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: Request | NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  try {
    if (!id) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id: id },
      include: {
        brand: true,
        category: true,
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

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

    if (!id) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id: id },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const body = (await req.json()) as ProductUpdateInput;

    // Validate data types if provided
    if (
      body.price !== undefined &&
      (typeof body.price !== "number" || body.price <= 0)
    ) {
      return NextResponse.json(
        { error: "Price must be a positive number" },
        { status: 400 }
      );
    }

    if (
      body.stock !== undefined &&
      (typeof body.stock !== "number" ||
        body.stock < 0 ||
        !Number.isInteger(body.stock))
    ) {
      return NextResponse.json(
        { error: "Stock must be a non-negative integer" },
        { status: 400 }
      );
    }

    // Check if brand exists if brandId is being updated
    if (body.brandId) {
      const brand = await prisma.brand.findUnique({
        where: { id: body.brandId },
      });
      if (!brand) {
        return NextResponse.json(
          { error: "Invalid brand ID" },
          { status: 400 }
        );
      }
    }

    // Check if category exists if categoryId is being updated
    if (body.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: body.categoryId },
      });
      if (!category) {
        return NextResponse.json(
          { error: "Invalid category ID" },
          { status: 400 }
        );
      }
    }

    const updatedProduct = await prisma.product.update({
      where: { id: id },
      data: body,
      include: {
        brand: true,
        category: true,
      },
    });

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
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

    if (!id) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id: id },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Check if product has related records
    const hasOrderItems = await prisma.orderItem.findFirst({
      where: { productId: id },
    });

    if (hasOrderItems) {
      return NextResponse.json(
        { error: "Cannot delete product with existing orders" },
        { status: 400 }
      );
    }

    // First delete related reviews and cart items
    await prisma.$transaction([
      prisma.productReview.deleteMany({
        where: { productId: id },
      }),
      prisma.cartItem.deleteMany({
        where: { productId: id },
      }),
      prisma.product.delete({
        where: { id: id },
      }),
    ]);

    return NextResponse.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
