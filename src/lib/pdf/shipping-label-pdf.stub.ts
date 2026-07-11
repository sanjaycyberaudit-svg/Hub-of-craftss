/** Server stub — real PDF engine is browser-only (keeps Worker under Free 3 MiB). */

export type PdfLabelOrder = {
  id: string;
  sender_details: string;
  recipient_details: string;
};

export class PdfAddressTooLongError extends Error {
  readonly name = "PdfAddressTooLongError";
  constructor(message = "Address is too long for the shipping label PDF.") {
    super(message);
  }
}

export async function downloadOrderPdf(_order: PdfLabelOrder) {
  throw new Error("Shipping label PDF is only available in the browser.");
}

export async function downloadOrdersPdf(_orders: PdfLabelOrder[]) {
  throw new Error("Shipping label PDF is only available in the browser.");
}
