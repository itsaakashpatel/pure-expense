import type { ParsedReceipt } from "@/api/types";

// In-memory hand-off between the scan screen and the review screen, so we don't
// have to serialize the parsed receipt + local image URI through route params.
export type ReceiptDraft = {
  imageUri: string | null;
  parsed: ParsedReceipt;
  rawText: string;
};

let pending: ReceiptDraft | null = null;

export function setDraft(draft: ReceiptDraft): void {
  pending = draft;
}

export function takeDraft(): ReceiptDraft | null {
  const d = pending;
  pending = null;
  return d;
}
