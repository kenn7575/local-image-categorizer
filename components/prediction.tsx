"use client";

import { useState, ChangeEvent } from "react";
import { predictionItem, ProcessStep } from "@/lib/types";
import { GlassmorphismLaunchTimelineBlock } from "./uitripled/glassmorphism-launch-timeline-block-shadcnui";
import { loadModelUsingOnnx, processImageUsingOnnx } from "@/lib/modelManager";

interface PredictionResult {
  fileName: string;
  prediction: predictionItem[];
  imageUrl: string;
  file?: File;
}

export default function PredictImage() {
  const [results, setResults] = useState<PredictionResult[]>([]);
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
      setResults(predictions);

      await saveResults(predictions);
    } catch (error) {
      console.error("Error processing images:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const saveResults = async (predictions: PredictionResult[]) => {
    setStatus(ProcessStep.SORTING);
    const collectionId = Date.now().toString();

    // Batch upload: multipart/form-data with repeated "files" and "filePaths"
    const formData = new FormData();

    const reviewList = predictions.map((prediction) => {
      const type = prediction.prediction.sort(
        (a, b) => b.certainty - a.certainty,
      )[0].type;

      const filePath = prediction.file ? `${type}/${prediction.file.name}` : "";

      if (prediction.file) {
        formData.append("files", prediction.file);
        formData.append("filePaths", filePath);
      }

      return { ...prediction, filePath };
    });

    try {
      const res = await fetch("/api/files", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Upload failed (${res.status})`);
      }
    } catch (error) {
      console.error("Failed to save files:", error);
      return;
    }

    localStorage.setItem(
      "reviewCollection_" + collectionId,
      JSON.stringify(reviewList),
    );
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
