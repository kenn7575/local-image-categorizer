"use client";

import { useEffect, useState } from "react";
import * as ort from "onnxruntime-web";

type Args = {
  modelUrl: string;
  labelsUrl: string;
  wasmPaths?: string;
};

export function useOnnxModel({ modelUrl, labelsUrl, wasmPaths }: Args) {
  const [session, setSession] = useState<ort.InferenceSession>();
  const [labels, setLabels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (wasmPaths) ort.env.wasm.wasmPaths = wasmPaths;

        const [session, labels] = await Promise.all([
          ort.InferenceSession.create(modelUrl, {
            executionProviders: ["wasm"],
            graphOptimizationLevel: "all",
          }),
          fetch(labelsUrl).then((r) => r.json() as Promise<string[]>),
        ]);

        if (cancelled) return;
        setSession(session);
        setLabels(labels);
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [modelUrl, labelsUrl, wasmPaths]);

  return { session, labels, loading, error };
}
