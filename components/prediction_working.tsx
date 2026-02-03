"use client";

import { ChangeEvent, useEffect, useState } from "react";
import * as ort from "onnxruntime-web";

const SIZE = 150;

async function toTensor(url: string) {
  const img = new Image();
  img.src = url;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = c.height = SIZE;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("No ctx");
  ctx.drawImage(img, 0, 0, SIZE, SIZE);
  return ort.Tensor.fromImage(ctx.getImageData(0, 0, SIZE, SIZE));
}

export default function PredictImage() {
  const [session, setSession] = useState<ort.InferenceSession | null>(null);
  const [labels, setLabels] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [best, setBest] = useState<{ label: string; prob: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        ort.env.wasm.wasmPaths =
          "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/";

        const [sess, lbls] = await Promise.all([
          ort.InferenceSession.create("/model/model.onnx", {
            executionProviders: ["wasm"],
            graphOptimizationLevel: "all",
          }),
          fetch("/model/labels.json").then(
            (r) => r.json() as Promise<string[]>,
          ),
        ]);
        setSession(sess);
        setLabels(lbls);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  const handleImage = async (e: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setBest(null);

    const file = e.target.files?.[0];
    if (!file) return;
    if (!session) {
      setError("Model is still loading...");
      return;
    }

    const url = URL.createObjectURL(file);
    setImageUrl(url);

    try {
      const out = await session.run({
        [session.inputNames[0]]: await toTensor(url),
      });
      const y = out[session.outputNames[0]];
      const scores = Array.from((y?.data as Float32Array) ?? []);
      if (!scores.length) throw new Error("No output");

      let bestI = 0;
      for (let i = 1; i < scores.length; i++)
        if (scores[i] > scores[bestI]) bestI = i;
      const m = Math.max(...scores);
      const sum = scores.reduce((a, s) => a + Math.exp(s - m), 0) || 1;
      setBest({
        label: labels[bestI] ?? `class_${bestI}`,
        prob: Math.exp(scores[bestI] - m) / sum,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleImage} />
      {!session && !error && <div>Loading…</div>}
      {error && <div>{error}</div>}

      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="Uploaded" style={{ maxWidth: 320 }} />
      )}

      {best && (
        <div>
          {best.label} ({(best.prob * 100).toFixed(1)}%)
        </div>
      )}
    </div>
  );
}
