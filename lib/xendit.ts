import { Invoice } from "xendit-node";

export const createXenditInvoice = async (params: {
  externalId: string;
  amount: number;
  payerEmail: string;
  description: string;
  successRedirectUrl: string;
  failureRedirectUrl: string;
}) => {
  const invoice = new Invoice({
    secretKey: process.env.NEXT_PUBLIC_XENDIT_API_KEY!,
  });

  try {
    const response = await invoice.createInvoice({
      data: {
        externalId: params.externalId,
        amount: params.amount,
        payerEmail: params.payerEmail,
        description: params.description,
        successRedirectUrl: params.successRedirectUrl,
        failureRedirectUrl: params.failureRedirectUrl,
      },
    });
    return response;
  } catch (error) {
    console.error("Xendit invoice creation error:", error);
    throw error;
  }
};

export const getXenditInvoice = async (invoiceId: string) => {
  const invoice = new Invoice({
    secretKey: process.env.XENDIT_API_KEY!,
  });

  try {
    const response = await invoice.getInvoiceById({
      invoiceId,
    });
    return response;
  } catch (error) {
    console.error("Xendit invoice retrieval error:", error);
    throw error;
  }
};
