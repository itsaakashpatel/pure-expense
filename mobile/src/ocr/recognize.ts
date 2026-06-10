import TextRecognition from "@react-native-ml-kit/text-recognition";

// On-device OCR (Google ML Kit). Returns the raw text block of a receipt image,
// which we then send to the Worker for LLM structuring. No network, no API key.
export async function recognizeReceiptText(imageUri: string): Promise<string> {
  const result = await TextRecognition.recognize(imageUri);
  return result.text?.trim() ?? "";
}
