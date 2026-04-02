import Tesseract from "tesseract.js";

export interface OcrExpenseDraft {
  amount?: number | undefined;
  date?: string | undefined;
  merchant?: string | undefined;
  description?: string | undefined;
  category?: string | undefined;
  rawText: string;
}

function parseAmount(text: string): number | undefined {
  const matches = text.match(/(?:total|amount|grand total)?\s*[:\-]?\s*(\d+[\.,]\d{2})/i);
  if (!matches?.[1]) {
    return undefined;
  }
  return Number(matches[1].replace(",", "."));
}

function parseDate(text: string): string | undefined {
  const dateMatch = text.match(/(\d{4}[\/-]\d{2}[\/-]\d{2}|\d{2}[\/-]\d{2}[\/-]\d{4})/);
  if (!dateMatch?.[1]) {
    return undefined;
  }

  const value = dateMatch[1];
  if (/^\d{4}/.test(value)) {
    return value.replace(/\//g, "-");
  }

  const [dd, mm, yyyy] = value.split(/[\/-]/);
  return `${yyyy}-${mm}-${dd}`;
}

function parseMerchant(text: string): string | undefined {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return lines[0];
}

export async function extractExpenseFromReceipt(imagePath: string): Promise<OcrExpenseDraft> {
  const result = await Tesseract.recognize(imagePath, "eng");
  const rawText = result.data.text || "";
  const amount = parseAmount(rawText);
  const date = parseDate(rawText);
  const merchant = parseMerchant(rawText);

  const draft: OcrExpenseDraft = {
    description: "Auto-generated from receipt OCR",
    category: "MEAL",
    rawText,
  };

  if (amount !== undefined) {
    draft.amount = amount;
  }
  if (date !== undefined) {
    draft.date = date;
  }
  if (merchant !== undefined) {
    draft.merchant = merchant;
  }

  return draft;
}
