import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { unauthorizedResponse, getCurrentUser } from "@/lib/middleware";
import { z } from "zod";

const cartInputSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1),
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser(request);
    if (!user) return unauthorizedResponse();

    // Role-based access control
    if (user.role !== "CUSTOMER") {
      return NextResponse.json(
        { error: "Access denied. Only customers can add to cart." },
        { status: 403 }
      );
    }

    // Validate input
    const body = await request.json();
    const parsed = cartInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { productId, quantity } = parsed.data;

    // Check product availability
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (product.stock < quantity) {
      return NextResponse.json(
        {
          error: "Not enough stock available",
          available: product.stock,
        },
        { status: 400 }
      );
    }

    // Check existing cart item
    const existingCartItem = await prisma.cartItem.findFirst({
      where: {
        userId: user.id,
        productId,
      },
    });

    if (existingCartItem) {
      const newTotalQuantity = existingCartItem.quantity + quantity;

      if (newTotalQuantity > product.stock) {
        return NextResponse.json(
          {
            error: "Cannot add this quantity. It exceeds available stock.",
            currentInCart: existingCartItem.quantity,
            available: product.stock,
          },
          { status: 400 }
        );
      }

      const updatedCartItem = await prisma.cartItem.update({
        where: { id: existingCartItem.id },
        data: { quantity: newTotalQuantity },
      });

      return NextResponse.json(
        { message: "Cart item updated", data: updatedCartItem },
        { status: 200 }
      );
    }

    const newCartItem = await prisma.cartItem.create({
      data: {
        userId: user.id,
        productId,
        quantity,
      },
    });

    return NextResponse.json(
      { message: "Item added to cart", data: newCartItem },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding item to cart:", error);
    return NextResponse.json(
      { error: "Failed to add item to cart" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    // Only allow CUSTOMER role
    if (user.role !== "CUSTOMER") {
      return NextResponse.json(
        { error: "Access denied: only customers can view the cart." },
        { status: 403 }
      );
    }

    // Get all cart items for the user with product details
    const cartItems = await prisma.cartItem.findMany({
      where: {
        userId: user.id,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            imageUrl: true,
            stock: true,
          },
        },
      },
    });

    // Calculate total price with numeric precision
    const totalPrice = cartItems.reduce((sum, item) => {
      const productPrice = item.product?.price || 0;
      const quantity = item.quantity || 0;
      return sum + productPrice * quantity;
    }, 0);

    return NextResponse.json(
      {
        items: cartItems,
        totalPrice: Number(totalPrice.toFixed(2)), // rounded to 2 decimal places
        itemCount: cartItems.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching cart items:", error);
    return NextResponse.json(
      { error: "Failed to fetch cart items" },
      { status: 500 }
    );
  }
}
