import { BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType, BarcodeFormat } from '@zxing/library';
import type { IScannerControls } from '@zxing/browser';

/**
 * Camera barcode scanning that works across iOS Safari and Android Chrome.
 * ZXing is used rather than the native BarcodeDetector API because iOS Safari
 * does not implement BarcodeDetector.
 */
export function createReader(): BrowserMultiFormatReader {
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39
  ]);
  return new BrowserMultiFormatReader(hints);
}

export async function startScanning(
  video: HTMLVideoElement,
  onResult: (text: string) => void,
  onError: (err: unknown) => void
): Promise<IScannerControls | null> {
  const reader = createReader();
  try {
    const controls = await reader.decodeFromConstraints(
      { video: { facingMode: 'environment' } },
      video,
      (result, err) => {
        if (result) onResult(result.getText());
        // Per-frame decode misses are normal; ignore them.
        if (err && (err as Error).name && (err as Error).name !== 'NotFoundException') {
          // still ignore — NotFoundException fires constantly between reads
        }
      }
    );
    return controls;
  } catch (err) {
    onError(err);
    return null;
  }
}
