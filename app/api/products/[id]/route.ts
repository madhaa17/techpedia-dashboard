import cloudinary from "@/lib/cloudinary";
import {
  authAdminOnly,
  getCurrentUser,
  unauthorizedResponse,
} from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
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
    // Check authentication and admin status
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return unauthorizedResponse();
    }

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
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Parse form data instead of JSON to handle file uploads
    const formData = await req.formData();

    // Extract fields from form data
    const name = formData.get("name") as string | null;
    const description = formData.get("description") as string | null;
    const price = formData.get("price") as string | null;
    const stock = formData.get("stock") as string | null;
    const brandId = formData.get("brandId") as string | null;
    const categoryId = formData.get("categoryId") as string | null;
    const imageFile = formData.get("imageFile") as File | null;
    const removeImage = formData.get("removeImage") === "true";

    // Prepare update data
    const updateData: any = {
      name: name ?? undefined,
      description: description ?? undefined,
      brandId: brandId ?? undefined,
      categoryId: categoryId ?? undefined,
    };

    // Handle price if provided
    if (price) {
      const priceValue = parseFloat(price);
      if (isNaN(priceValue)) {
        return NextResponse.json(
          { error: "Price must be a valid number" },
          { status: 400 }
        );
      }
      updateData.price = priceValue;
    }

    // Handle stock if provided
    if (stock) {
      const stockValue = parseInt(stock);
      if (isNaN(stockValue)) {
        return NextResponse.json(
          { error: "Stock must be a valid integer" },
          { status: 400 }
        );
      }
      updateData.stock = stockValue;
    }

    // Validate numeric fields
    if (updateData.price !== undefined && updateData.price <= 0) {
      return NextResponse.json(
        { error: "Price must be a positive number" },
        { status: 400 }
      );
    }

    if (
      updateData.stock !== undefined &&
      (updateData.stock < 0 || !Number.isInteger(updateData.stock))
    ) {
      return NextResponse.json(
        { error: "Stock must be a non-negative integer" },
        { status: 400 }
      );
    }

    // Check if brand exists if brandId is being updated
    if (brandId) {
      const brand = await prisma.brand.findUnique({
        where: { id: brandId },
      });
      if (!brand) {
        return NextResponse.json(
          { error: "Invalid brand ID" },
          { status: 400 }
        );
      }
    }

    // Check if category exists if categoryId is being updated
    if (categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      });
      if (!category) {
        return NextResponse.json(
          { error: "Invalid category ID" },
          { status: 400 }
        );
      }
    }

    // Handle image updates
    if (imageFile || removeImage) {
      // Delete old image from Cloudinary if it exists
      if (existingProduct.imageUrl) {
        try {
          const publicId = existingProduct.imageUrl
            .split("/")
            .pop()
            ?.split(".")[0];
          if (publicId) {
            await cloudinary.uploader.destroy(publicId);
          }
        } catch (error) {
          console.error("Error deleting old image:", error);
          // Continue even if deletion fails
        }
      }

      if (imageFile) {
        // Upload new image
        const arrayBuffer = await imageFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Image = `data:${imageFile.type};base64,${buffer.toString(
          "base64"
        )}`;

        try {
          const uploadResult = await cloudinary.uploader.upload(base64Image, {
            folder: "products",
          });
          updateData.imageUrl = uploadResult.secure_url;
        } catch (error) {
          console.error("Cloudinary upload error:", error);
          return NextResponse.json(
            { error: "Failed to upload new image" },
            { status: 500 }
          );
        }
      } else if (removeImage) {
        // Remove image completely if requested
        updateData.imageUrl = null;
      }
    }

    // Update the product
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: updateData,
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
    // Check authentication and admin status
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return unauthorizedResponse();
    }

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
      where: { id },
      include: {
        reviews: true,
        CartItem: true,
        orderItems: true,
      },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Check if product has related order items
    if (existingProduct.orderItems.length > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete product with existing orders",
          suggestion: "Consider archiving the product instead",
          orderCount: existingProduct.orderItems.length,
        },
        { status: 400 }
      );
    }

    // Delete associated image from Cloudinary if it exists
    if (existingProduct.imageUrl) {
      try {
        const publicId = existingProduct.imageUrl
          .split("/")
          .pop()
          ?.split(".")[0];
        if (publicId) {
          await cloudinary.uploader.destroy(publicId);
        }
      } catch (error) {
        console.error("Error deleting product image from Cloudinary:", error);
        // Continue with deletion even if image cleanup fails
      }
    }

    // Use transaction to ensure all deletions succeed or fail together
    await prisma.$transaction(async (tx) => {
      // Delete all reviews first
      if (existingProduct.reviews.length > 0) {
        await tx.productReview.deleteMany({
          where: { productId: id },
        });
      }

      // Delete all cart items
      if (existingProduct.CartItem.length > 0) {
        await tx.cartItem.deleteMany({
          where: { productId: id },
        });
      }

      // Finally delete the product
      await tx.product.delete({
        where: { id },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Product deleted successfully",
      deletedProductId: id,
      imageCleaned: !!existingProduct.imageUrl,
    });
  } catch (error) {
    console.error("Error deleting product:", error);

    // More specific error handling
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        {
          error: "Database error during product deletion",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to delete product",
        ...(error instanceof Error && { details: error.message }),
      },
      { status: 500 }
    );
  }
}
