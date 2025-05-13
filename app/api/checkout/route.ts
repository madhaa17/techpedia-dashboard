import { NextResponse } from "next/server";
import { createXenditInvoice } from "@/lib/xendit";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, unauthorizedResponse } from "@/lib/middleware";
import { PaymentStatus, Role } from "@prisma/client";

export async function POST(req: Request) {
  const user = await getCurrentUser(req);

  if (!user) {
    return unauthorizedResponse();
  }

  if (user.role !== "CUSTOMER") {
    return NextResponse.json(
      { error: "Access denied: only customers can make payment." },
      { status: 403 }
    );
  }

  try {
    const cartItems = await prisma.cartItem.findMany({
      where: {
        userId: user.id,
      },
      include: {
        product: true,
      },
    });

    if (cartItems.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const totalAmount = cartItems.reduce((acc, item) => {
      return acc + item.product.price * item.quantity;
    }, 0);

    for (const item of cartItems) {
      if (item.product.stock < item.quantity) {
        return NextResponse.json(
          {
            error: "Insufficient stock",
            productId: item.product.id,
            productName: item.product.name,
            availableStock: item.product.stock,
            requestedQuantity: item.quantity,
          },
          { status: 400 }
        );
      }
    }

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        totalAmount: totalAmount,
        paymentStatus: PaymentStatus.PENDING,
        paymentMethod: "XENDIT",
        items: {
          create: cartItems.map((item) => ({
            productId: item.productId,
            price: item.product.price,
            quantity: item.quantity,
          })),
        },
      },
    });

    // Create Xendit invoice
    const invoice = await createXenditInvoice({
      externalId: order.id,
      amount: totalAmount,
      payerEmail: user.email,
      description: `Payment for Order #${order.id}`,
      successRedirectUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/orders/${order.id}?payment=success`,
      failureRedirectUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/orders/${order.id}?payment=failed`,
    });

    await prisma.cartItem.deleteMany({
      where: { userId: user.id },
    });

    return NextResponse.json({
      orderId: order.id,
      invoiceUrl: invoice.invoiceUrl,
      totalAmount: totalAmount,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to process checkout" },
      { status: 500 }
    );
  }
}
