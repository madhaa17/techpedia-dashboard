import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authAdminOnly } from "@/lib/middleware";
import cloudinary from "@/lib/cloudinary";

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

    const mappedProducts = products.map((product) => ({
      ...product,
      brand: product.brand ? { ...product.brand } : null,
      category: product.category || null,
    }));

    const response: ProductsResponse = {
      data: mappedProducts,
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

    const formData = await req.formData();

    // Extract all fields from form data
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const price = parseFloat(formData.get("price") as string);
    const stock = parseInt(formData.get("stock") as string);
    const brandId = formData.get("brandId") as string;
    const categoryId = formData.get("categoryId") as string;
    const imageFile = formData.get("imageFile") as File | null;

    // Validate required fields
    const requiredFields = [
      "name",
      "description",
      "price",
      "stock",
      "brandId",
      "categoryId",
    ];
    const missingFields = requiredFields.filter(
      (field) => !formData.get(field)
    );

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate data types
    if (isNaN(price) || price <= 0) {
      return NextResponse.json(
        { error: "Price must be a positive number" },
        { status: 400 }
      );
    }

    if (isNaN(stock) || stock < 0 || !Number.isInteger(stock)) {
      return NextResponse.json(
        { error: "Stock must be a non-negative integer" },
        { status: 400 }
      );
    }

    // Check if brand and category exist
    const [brand, category] = await Promise.all([
      prisma.brand.findUnique({ where: { id: brandId } }),
      prisma.category.findUnique({ where: { id: categoryId } }),
    ]);

    if (!brand) {
      return NextResponse.json({ error: "Invalid brand ID" }, { status: 400 });
    }
    if (!category) {
      return NextResponse.json(
        { error: "Invalid category ID" },
        { status: 400 }
      );
    }

    let imageUrl = "";

    // Handle image upload if provided
    if (imageFile) {
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Convert to base64 for Cloudinary upload
      const base64Image = `data:${imageFile.type};base64,${buffer.toString(
        "base64"
      )}`;

      try {
        const uploadResult = await cloudinary.uploader.upload(base64Image, {
          folder: "products",
        });
        imageUrl = uploadResult.secure_url;
      } catch (error) {
        console.error("Cloudinary upload error:", error);
        return NextResponse.json(
          { error: "Failed to upload image" },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Product image is required" },
        { status: 400 }
      );
    }

    // Create the product
    const product = await prisma.product.create({
      data: {
        name,
        description,
        price,
        stock,
        imageUrl,
        brandId,
        categoryId,
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
