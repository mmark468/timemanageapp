import type { ImageFingerprint } from "./types";

const HASH_SIZE = 8;
const HEX_CHUNK_SIZE = 4;

export async function createImageFingerprint(file: File): Promise<ImageFingerprint> {
  const bitmap = await createImageBitmap(file);
  const originalWidth = bitmap.width;
  const originalHeight = bitmap.height;
  const canvas = document.createElement("canvas");
  canvas.width = HASH_SIZE;
  canvas.height = HASH_SIZE;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Cannot create image canvas.");
  }

  context.drawImage(bitmap, 0, 0, HASH_SIZE, HASH_SIZE);
  const pixels = context.getImageData(0, 0, HASH_SIZE, HASH_SIZE).data;
  bitmap.close();

  const greys = getGreyValues(pixels);
  const averageGrey = greys.reduce((sum, grey) => sum + grey, 0) / greys.length;
  const binaryHash = greys.map((grey) => (grey >= averageGrey ? "1" : "0")).join("");

  return {
    hash: binaryToHex(binaryHash),
    width: originalWidth,
    height: originalHeight,
  };
}

export function getHashDistance(leftHash?: string, rightHash?: string): number | null {
  if (!leftHash || !rightHash) return null;

  const leftBits = hexToBinary(leftHash);
  const rightBits = hexToBinary(rightHash);
  const comparedLength = Math.min(leftBits.length, rightBits.length);

  let distance = Math.abs(leftBits.length - rightBits.length);
  for (let index = 0; index < comparedLength; index += 1) {
    if (leftBits[index] !== rightBits[index]) distance += 1;
  }

  return distance;
}

function getGreyValues(pixels: Uint8ClampedArray): number[] {
  const greys: number[] = [];

  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index] ?? 0;
    const green = pixels[index + 1] ?? 0;
    const blue = pixels[index + 2] ?? 0;
    greys.push(red * 0.299 + green * 0.587 + blue * 0.114);
  }

  return greys;
}

function binaryToHex(binaryHash: string): string {
  const chunks = binaryHash.match(new RegExp(`.{1,${HEX_CHUNK_SIZE}}`, "g")) ?? [];
  return chunks.map((chunk) => parseInt(chunk.padEnd(HEX_CHUNK_SIZE, "0"), 2).toString(16)).join("");
}

function hexToBinary(hexHash: string): string {
  return hexHash
    .toLowerCase()
    .replace(/[^0-9a-f]/g, "")
    .split("")
    .map((char) => parseInt(char, 16).toString(2).padStart(HEX_CHUNK_SIZE, "0"))
    .join("");
}
