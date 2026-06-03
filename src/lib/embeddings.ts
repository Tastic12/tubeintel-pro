/**
 * CLIP (ViT-B/32) embeddings via @xenova/transformers.
 * Text and image share a 512-d space for cosine similarity search.
 */
import {
  AutoProcessor,
  AutoTokenizer,
  CLIPTextModelWithProjection,
  CLIPVisionModelWithProjection,
  RawImage,
  env,
} from '@xenova/transformers';

const MODEL_ID = 'Xenova/clip-vit-base-patch32';

env.allowLocalModels = false;
env.allowRemoteModels = true;
if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
  env.cacheDir = '/tmp/.transformers-cache';
}

type TextModel = Awaited<ReturnType<typeof CLIPTextModelWithProjection.from_pretrained>>;
type VisionModel = Awaited<ReturnType<typeof CLIPVisionModelWithProjection.from_pretrained>>;
type Tokenizer = Awaited<ReturnType<typeof AutoTokenizer.from_pretrained>>;
type Processor = Awaited<ReturnType<typeof AutoProcessor.from_pretrained>>;

let textBundle: Promise<{ tokenizer: Tokenizer; model: TextModel }> | null = null;
let visionBundle: Promise<{ processor: Processor; model: VisionModel }> | null = null;

async function getTextBundle() {
  if (!textBundle) {
    textBundle = Promise.all([
      AutoTokenizer.from_pretrained(MODEL_ID),
      CLIPTextModelWithProjection.from_pretrained(MODEL_ID, { quantized: true }),
    ]).then(([tokenizer, model]) => ({ tokenizer, model }));
  }
  return textBundle;
}

async function getVisionBundle() {
  if (!visionBundle) {
    visionBundle = Promise.all([
      AutoProcessor.from_pretrained(MODEL_ID),
      CLIPVisionModelWithProjection.from_pretrained(MODEL_ID, { quantized: true }),
    ]).then(([processor, model]) => ({ processor, model }));
  }
  return visionBundle;
}

function l2Normalize(vec: number[]): number[] {
  let sumSq = 0;
  for (const v of vec) sumSq += v * v;
  const norm = Math.sqrt(sumSq) || 1;
  return vec.map((v) => v / norm);
}

export async function embedText(text: string): Promise<number[]> {
  const { tokenizer, model } = await getTextBundle();
  const inputs = tokenizer([text], { padding: true, truncation: true });
  const { text_embeds } = (await model(inputs)) as { text_embeds: { tolist: () => number[][] } };
  return l2Normalize(text_embeds.tolist()[0]);
}

export async function embedImageFromUrl(url: string): Promise<number[]> {
  const { processor, model } = await getVisionBundle();
  const image = await RawImage.fromURL(url);
  const inputs = await processor(image);
  const { image_embeds } = (await model(inputs)) as {
    image_embeds: { tolist: () => number[][] };
  };
  return l2Normalize(image_embeds.tolist()[0]);
}

export async function embedImageFromBuffer(
  buffer: ArrayBuffer | Uint8Array,
  mimeType = 'image/jpeg'
): Promise<number[]> {
  const { processor, model } = await getVisionBundle();
  const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;

  let image;
  try {
    const b64 = Buffer.from(bytes).toString('base64');
    image = await RawImage.fromURL(`data:${mimeType};base64,${b64}`);
  } catch {
    const blob = new Blob([bytes as BlobPart], { type: mimeType });
    image = await RawImage.fromBlob(blob);
  }

  const inputs = await processor(image);
  const { image_embeds } = (await model(inputs)) as {
    image_embeds: { tolist: () => number[][] };
  };
  return l2Normalize(image_embeds.tolist()[0]);
}

export function embeddingToPgvectorText(vec: number[]): string {
  return `[${vec.join(',')}]`;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}
