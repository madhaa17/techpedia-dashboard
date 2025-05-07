import { getCurrentUser, unauthorizedResponse } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// PUT /api/cart/:id - Update cart item quantity
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const { id } = await params;

    const cartItemId = id;

    if (!cartItemId) {
      return NextResponse.json(
        { error: "Cart item ID is required" },
        { status: 400 }
      );
    }

    // Parse request body
    const { quantity, userId } = await request.json();

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    if (!quantity || typeof quantity !== "number" || quantity < 1) {
      return NextResponse.json(
        { error: "Quantity must be a positive number" },
        { status: 400 }
      );
    }

    // Find the cart item
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: {
        product: true,
      },
    });

    if (!cartItem) {
      return NextResponse.json(
        { error: "Cart item not found" },
        { status: 404 }
      );
    }

    // Validate that the user owns this cart item
    if (cartItem.userId !== userId) {
      return NextResponse.json(
        {
          error:
            "Access denied: This cart item does not belong to the specified user",
        },
        { status: 403 }
      );
    }

    // Check if there's enough stock
    if (cartItem.product.stock < quantity) {
      return NextResponse.json(
        {
          error: "Not enough stock available",
          available: cartItem.product.stock,
        },
        { status: 400 }
      );
    }

    // Update the cart item quantity
    const updatedCartItem = await prisma.cartItem.update({
      where: { id: cartItemId },
      data: {
        quantity,
      },
      include: {
        product: {
          select: {
            name: true,
            price: true,
          },
        },
      },
    });

    return NextResponse.json(updatedCartItem, { status: 200 });
  } catch (error) {
    console.error("Error updating cart item:", error);
    return NextResponse.json(
      { error: "Failed to update cart item" },
      { status: 500 }
    );
  }
}

// DELETE /api/cart/:id - Remove item from cart
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    const cartItemId = id;

    if (!cartItemId) {
      return NextResponse.json(
        { error: "Cart item ID is required" },
        { status: 400 }
      );
    }

    // Get userId from query parameter
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Find the cart item
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
    });

    if (!cartItem) {
      return NextResponse.json(
        { error: "Cart item not found" },
        { status: 404 }
      );
    }

    // Validate that the user owns this cart item
    if (cartItem.userId !== userId) {
      return NextResponse.json(
        {
          error:
            "Access denied: This cart item does not belong to the specified user",
        },
        { status: 403 }
      );
    }

    // Delete the cart item
    await prisma.cartItem.delete({
      where: { id: cartItemId },
    });

    return NextResponse.json(
      { message: "Cart item removed successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error removing cart item:", error);
    return NextResponse.json(
      { error: "Failed to remove cart item" },
      { status: 500 }
    );
  }
}
