"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { runSingleImageClassification } from "@/lib/onnx/run";
import { useOnnxModel } from "@/lib/onnx/useOnnxModel";

export default function PredictImage() {
  const {
    session,
    labels,
    loading,
    error: loadError,
  } = useOnnxModel({
    modelUrl: "/model/model.onnx",
    labelsUrl: "/model/labels.json",
    wasmPaths: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/",
  });

  const [previewUrl, setPreviewUrl] = useState<string>();
  const [result, setResult] = useState<{ label: string; confidence: number }>();
  const [error, setError] = useState<string>();

  // Clean up object URL when the preview changes/unmounts
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function onPickImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!session) {
      setError("Model still loading…");
      return;
    }

    setError(undefined);
    setResult(undefined);

    const url = URL.createObjectURL(file);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });

    try {
      const r = await runSingleImageClassification({
        session,
        labels,
        imageUrl: url,
        inputSize: 150,
      });
      setResult(r);
    } catch (err) {
      setError(String(err));
    }
  }

  const displayError = error ?? loadError;

  return (
    <div>
      <input type="file" accept="image/*" onChange={onPickImage} />

      {loading && !displayError && <div>Loading…</div>}
      {displayError && <div>{displayError}</div>}

      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt="Uploaded" style={{ maxWidth: 320 }} />
      )}

      {result && (
        <div className="capitalize">
          {result.label} ({(result.confidence * 100).toFixed(1)}%)
        </div>
      )}
    </div>
  );
}
