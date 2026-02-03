"use client";

import { ChangeEvent, useMemo, useState } from "react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

type PredictResponse = {
  predictedLabel: string;
  confidence: number;
  top3: Array<{ label: string; probability: number }>;
  probabilities?: Array<{ label: string; probability: number }>;
  error?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toNumber(value: unknown): number {
  return typeof value === "number" ? value : Number(value);
}

function parsePredictResponse(value: unknown): PredictResponse {
  if (!isRecord(value)) {
    return {
      predictedLabel: "",
      confidence: 0,
      top3: [],
      error: "Invalid response",
    };
  }

  const predictedLabel =
    typeof value.predictedLabel === "string" ? value.predictedLabel : "";
  const confidence = toNumber(value.confidence);

  const top3Raw = value.top3;
  const top3 = Array.isArray(top3Raw)
    ? top3Raw.filter(isRecord).map((x) => ({
        label: typeof x.label === "string" ? x.label : "",
        probability: toNumber(x.probability),
      }))
    : [];

  const probsRaw = value.probabilities;
  const probabilities = Array.isArray(probsRaw)
    ? probsRaw.filter(isRecord).map((x) => ({
        label: typeof x.label === "string" ? x.label : "",
        probability: toNumber(x.probability),
      }))
    : undefined;

  const error = typeof value.error === "string" ? value.error : undefined;
  return { predictedLabel, confidence, top3, probabilities, error };
}

export default function PredictImage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<null | {
    predictedLabel: string;
    confidence: number;
    top3: Array<{ label: string; probability: number }>;
    probabilities?: Array<{ label: string; probability: number }>;
  }>(null);

  const handleImage = (e: ChangeEvent<HTMLInputElement>) => {
    const nextFile = e.target.files?.[0] ?? null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPrediction(null);
    setError(null);
    setFile(nextFile);
    setPreviewUrl(nextFile ? URL.createObjectURL(nextFile) : null);
  };

  const canPredict = useMemo(() => !!file && !loading, [file, loading]);

  const runPrediction = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setPrediction(null);

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/predict", { method: "POST", body: form });
      const data = parsePredictResponse(await res.json());
      if (!res.ok)
        throw new Error(data.error || `Request failed (${res.status})`);

      setPrediction({
        predictedLabel: data.predictedLabel,
        confidence: data.confidence,
        top3: data.top3,
        probabilities: data.probabilities,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl p-4">
      <Card className="p-6">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-xl font-semibold">Image classification</h1>
            <p className="text-muted-foreground text-sm">
              Upload an image and the ONNX model predicts its class.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="file">Image</Label>
            <input
              id="file"
              type="file"
              accept="image/*"
              onChange={handleImage}
            />
          </div>

          {previewUrl && (
            <div className="relative aspect-video w-full overflow-hidden rounded-md border">
              <Image
                src={previewUrl}
                alt="Uploaded preview"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button onClick={runPrediction} disabled={!canPredict}>
              {loading ? "Predicting…" : "Predict"}
            </Button>
            {error && <div className="text-sm text-red-600">{error}</div>}
          </div>

          {prediction && (
            <div className="grid gap-2 rounded-md border p-4">
              <div className="text-sm">
                <span className="text-muted-foreground">Prediction: </span>
                <span className="font-semibold">
                  {prediction.predictedLabel}
                </span>
                <span className="text-muted-foreground">
                  {" "}
                  ({Math.round(prediction.confidence * 1000) / 10}%)
                </span>
              </div>

              {prediction.top3.length > 0 && (
                <div className="text-sm">
                  <div className="text-muted-foreground mb-1">Top 3</div>
                  <ul className="grid gap-1">
                    {prediction.top3.map((x) => (
                      <li key={x.label} className="flex justify-between">
                        <span>{x.label}</span>
                        <span className="text-muted-foreground">
                          {Math.round(x.probability * 1000) / 10}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {prediction.probabilities &&
                prediction.probabilities.length > 0 && (
                  <div className="text-sm">
                    <div className="text-muted-foreground mb-1">
                      All classes
                    </div>
                    <ul className="grid gap-1">
                      {prediction.probabilities
                        .slice()
                        .sort((a, b) => b.probability - a.probability)
                        .map((x) => (
                          <li key={x.label} className="flex justify-between">
                            <span>{x.label}</span>
                            <span className="text-muted-foreground">
                              {Math.round(x.probability * 1000) / 10}%
                            </span>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
