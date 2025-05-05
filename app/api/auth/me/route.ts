import { NextResponse } from "next/server";
import { getCurrentUser, unauthorizedResponse } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

/**
 * Get current authenticated user information
 */
export async function GET(req: Request): Promise<NextResponse> {
  try {
    const user = await getCurrentUser(req);

    if (!user) {
      return unauthorizedResponse();
    }

    // Get user with additional info based on role
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        // Include addresses for all users
        addresses: {
          select: {
            id: true,
            recipientName: true,
            phoneNumber: true,
            addressLine: true,
            city: true,
            postalCode: true,
            isDefault: true,
          },
        },
        // Include additional data for customer role
        ...(user.role === "CUSTOMER" && {
          orders: {
            select: {
              id: true,
              totalAmount: true,
              paymentStatus: true,
              createdAt: true,
              items: {
                select: {
                  id: true,
                  productId: true,
                  price: true,
                  quantity: true,
                  product: {
                    select: {
                      name: true,
                      imageUrl: true,
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 5, // Get only the last 5 orders for performance
          },
          CartItem: {
            select: {
              id: true,
              quantity: true,
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
          },
        }),
      },
    });

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(userData);
  } catch (error) {
    console.error("Error fetching user data:", error);
    return NextResponse.json(
      { error: "Failed to fetch user data" },
      { status: 500 }
    );
  }
}
