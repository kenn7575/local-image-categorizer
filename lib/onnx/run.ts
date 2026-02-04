"use client";

import * as ort from "onnxruntime-web";

function softmax(logits: Float32Array): number[] {
  let max = -Infinity;
  for (const v of logits) max = Math.max(max, v);

  let sum = 0;
  const exps = Array.from(logits, (v) => {
    const e = Math.exp(v - max);
    sum += e;
    return e;
  });

  return exps.map((e) => e / (sum || 1));
}

async function imageUrlToTensor(
  imageUrl: string,
  inputSize: number,
): Promise<ort.Tensor> {
  const img = new Image();
  img.src = imageUrl;
  await img.decode();

  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = inputSize;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.drawImage(img, 0, 0, inputSize, inputSize);
  const imageData = ctx.getImageData(0, 0, inputSize, inputSize);

  return ort.Tensor.fromImage(imageData);
}

export async function runSingleImageClassification(args: {
  session: ort.InferenceSession;
  labels: string[];
  imageUrl: string;
  inputSize: number;
}): Promise<{ label: string; confidence: number }> {
  const { session, labels, imageUrl, inputSize } = args;

  const tensor = await imageUrlToTensor(imageUrl, inputSize);

  const feeds = { [session.inputNames[0]]: tensor };
  const outputs = await session.run(feeds);

  const logits = outputs[session.outputNames[0]]?.data as
    | Float32Array
    | undefined;

  if (!logits?.length) throw new Error("Model returned no output");

  const probs = softmax(logits);

  let bestIdx = 0;
  for (let i = 1; i < probs.length; i++) {
    if (probs[i] > probs[bestIdx]) bestIdx = i;
  }

  return {
    label: labels[bestIdx] ?? `class_${bestIdx}`,
    confidence: probs[bestIdx],
  };
}
