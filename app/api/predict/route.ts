import path from "path";
import { readFile } from "fs/promises";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IMAGE_SIZE = 150;

// EfficientNet_B0_Weights.DEFAULT (ImageNet)
const IMAGENET_MEAN = [0.485, 0.456, 0.406] as const;
const IMAGENET_STD = [0.229, 0.224, 0.225] as const;

type OrtModule = typeof import("onnxruntime-node");

let sessionPromise: Promise<
  import("onnxruntime-node").InferenceSession
> | null = null;
let labelsPromise: Promise<string[]> | null = null;

async function getOrt(): Promise<OrtModule> {
  // Dynamic import avoids some bundling issues with native modules.
  return await import("onnxruntime-node");
}

async function getSession() {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const ort = await getOrt();
      const modelPath = path.join(
        process.cwd(),
        "public",
        "model",
        "model.onnx",
      );

      // Prefer CUDA if available, but fall back gracefully on machines without it.
      try {
        return await ort.InferenceSession.create(modelPath, {
          executionProviders: ["cuda", "cpu"],
        });
      } catch {
        return await ort.InferenceSession.create(modelPath, {
          executionProviders: ["cpu"],
        });
      }
    })();
  }
  return await sessionPromise;
}

async function getLabels(): Promise<string[]> {
  if (!labelsPromise) {
    labelsPromise = (async () => {
      const labelsPath = path.join(
        process.cwd(),
        "public",
        "model",
        "labels.json",
      );
      const raw = await readFile(labelsPath, "utf8");
      const parsed = JSON.parse(raw);
      if (
        !Array.isArray(parsed) ||
        !parsed.every((x) => typeof x === "string")
      ) {
        throw new Error("labels.json must be a JSON array of strings");
      }
      return parsed as string[];
    })();
  }
  return await labelsPromise;
}

function softmax(logits: readonly number[]) {
  let max = -Infinity;
  for (const v of logits) max = Math.max(max, v);
  const exps = logits.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((v) => v / (sum || 1));
}

function looksLikeProbabilities(values: readonly number[]) {
  if (values.length === 0) return false;
  let sum = 0;
  for (const v of values) {
    if (!Number.isFinite(v)) return false;
    if (v < 0 || v > 1) return false;
    sum += v;
  }
  return Math.abs(sum - 1) < 1e-2;
}

function topK(probs: readonly number[], k: number) {
  const indexed = probs.map((p, i) => ({ i, p }));
  indexed.sort((a, b) => b.p - a.p);
  return indexed.slice(0, Math.max(1, k));
}

async function preprocessToNCHWFloat32(imageBuffer: Buffer) {
  const sharp = (await import("sharp")).default;

  // Match torchvision: Resize((150,150)) + ToTensor() + Normalize(mean,std)
  const { data, info } = await sharp(imageBuffer)
    .rotate() // honor EXIF orientation
    .resize(IMAGE_SIZE, IMAGE_SIZE, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (info.channels !== 3) {
    throw new Error(
      `Expected 3 channels after preprocessing, got ${info.channels}`,
    );
  }

  const hw = IMAGE_SIZE * IMAGE_SIZE;
  const out = new Float32Array(1 * 3 * hw);

  for (let y = 0; y < IMAGE_SIZE; y++) {
    for (let x = 0; x < IMAGE_SIZE; x++) {
      const pixelIndex = (y * IMAGE_SIZE + x) * 3;
      const r = data[pixelIndex] / 255;
      const g = data[pixelIndex + 1] / 255;
      const b = data[pixelIndex + 2] / 255;

      const offset = y * IMAGE_SIZE + x;
      out[0 * hw + offset] = (r - IMAGENET_MEAN[0]) / IMAGENET_STD[0];
      out[1 * hw + offset] = (g - IMAGENET_MEAN[1]) / IMAGENET_STD[1];
      out[2 * hw + offset] = (b - IMAGENET_MEAN[2]) / IMAGENET_STD[2];
    }
  }

  return out;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        {
          error: "Missing file. Send multipart/form-data with a 'file' field.",
        },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const [session, labels, ort] = await Promise.all([
      getSession(),
      getLabels(),
      getOrt(),
    ]);

    const inputData = await preprocessToNCHWFloat32(buffer);
    const inputTensor = new ort.Tensor("float32", inputData, [
      1,
      3,
      IMAGE_SIZE,
      IMAGE_SIZE,
    ]);

    const inputName = session.inputNames[0];
    const outputName = session.outputNames[0];

    const outputs = await session.run({ [inputName]: inputTensor });
    const output = outputs[outputName];

    if (!output || output.type !== "float32") {
      throw new Error("Unexpected model output type or missing output");
    }

    const values = Array.from(output.data as Float32Array);
    if (labels.length !== values.length) {
      throw new Error(
        `Model output length (${values.length}) does not match labels length (${labels.length}). ` +
          "This usually means labels.json doesn't correspond to the exported model.",
      );
    }

    const probs = looksLikeProbabilities(values) ? values : softmax(values);
    const top = topK(probs, 3);
    const best = top[0];

    return NextResponse.json({
      predictedIndex: best.i,
      predictedLabel: labels[best.i] ?? String(best.i),
      confidence: best.p,
      top3: top.map(({ i, p }) => ({
        index: i,
        label: labels[i] ?? String(i),
        probability: p,
      })),
      probabilities: labels.map((label, i) => ({
        index: i,
        label,
        probability: probs[i] ?? 0,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
