"use client";

import { useState, ChangeEvent } from "react";
import { PredictionResult, ProcessStep } from "@/lib/types";
import { GlassmorphismLaunchTimelineBlock } from "./uitripled/glassmorphism-launch-timeline-block-shadcnui";
import { loadModelUsingOnnx, processImageUsingOnnx } from "@/lib/modelManager";

export default function PredictImage({
  setPredictions,
  setMode,
}: {
  setPredictions: (predictions: PredictionResult[]) => void;
  setMode?: (mode: "upload" | "review") => void;
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<ProcessStep>(ProcessStep.BEFORE_UPLOAD);

  const handleImages = async (e: ChangeEvent<HTMLInputElement>) => {
    setStatus(ProcessStep.IMPORTING);

    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    const fileArray = Array.from(files);

    try {
      setStatus(ProcessStep.LOADING_MODEL);
      const model = await loadModelUsingOnnx();

      setStatus(ProcessStep.CLASSIFYING);
      const predictions: PredictionResult[] = await Promise.all(
        fileArray.map(async (file) => {
          const result = await processImageUsingOnnx(file, model);
          return { ...result, file };
        }),
      );

      setStatus(ProcessStep.SORTING);
      setPredictions(predictions);

      if (setMode) setMode("review");
    } catch (error) {
      console.error("Error processing images:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {isProcessing && <p>Processing images...</p>}
      <GlassmorphismLaunchTimelineBlock
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = "image/*";
          input.multiple = true;
          input.onchange = (ev) =>
            handleImages(ev as unknown as ChangeEvent<HTMLInputElement>);
          input.click();
        }}
        status={status}
      />
    </>
  );
}
