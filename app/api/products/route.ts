import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authAdminOnly } from "@/lib/middleware";

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const brandId = searchParams.get("brandId");
    const categoryId = searchParams.get("categoryId");
    const search = searchParams.get("search");

    const where: any = {};

    if (brandId) where.brandId = brandId;
    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const total = await prisma.product.count({ where });

    const products = await prisma.product.findMany({
      where,
      include: { brand: true, category: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    const response: ProductsResponse = {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function createProduct(req: Request): Promise<NextResponse> {
  try {
    // Check admin authorization
    const isAdmin = await authAdminOnly(req);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    const body = (await req.json()) as ProductCreateInput;

    // Validate required fields
    const requiredFields: (keyof ProductCreateInput)[] = [
      "name",
      "description",
      "price",
      "stock",
      "imageUrl",
      "brandId",
      "categoryId",
    ];

    const missingFields = requiredFields.filter(
      (field) => body[field] === undefined
    );

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate data types
    if (typeof body.price !== "number" || body.price <= 0) {
      return NextResponse.json(
        { error: "Price must be a positive number" },
        { status: 400 }
      );
    }

    if (
      typeof body.stock !== "number" ||
      body.stock < 0 ||
      !Number.isInteger(body.stock)
    ) {
      return NextResponse.json(
        { error: "Stock must be a non-negative integer" },
        { status: 400 }
      );
    }

    // Check if brand and category exist
    const brand = await prisma.brand.findUnique({
      where: { id: body.brandId },
    });
    if (!brand) {
      return NextResponse.json({ error: "Invalid brand ID" }, { status: 400 });
    }

    const category = await prisma.category.findUnique({
      where: { id: body.categoryId },
    });
    if (!category) {
      return NextResponse.json(
        { error: "Invalid category ID" },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        name: body.name,
        description: body.description,
        price: body.price,
        stock: body.stock,
        imageUrl: body.imageUrl,
        brandId: body.brandId,
        categoryId: body.categoryId,
      },
      include: {
        brand: true,
        category: true,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    // Check admin authorization
    const isAdmin = await authAdminOnly(req);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    if (!params?.id) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id: params.id },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Check if product has related records
    const hasOrderItems = await prisma.orderItem.findFirst({
      where: { productId: params.id },
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
        where: { productId: params.id },
      }),
      prisma.cartItem.deleteMany({
        where: { productId: params.id },
      }),
      prisma.product.delete({
        where: { id: params.id },
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
