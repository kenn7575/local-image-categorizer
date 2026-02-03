"use client";

import { useEffect, useState, ChangeEvent } from "react";
import * as tf from "@tensorflow/tfjs";
import { loadModel, processImage } from "@/lib/modelManager";
import { predictionItem, ProcessStep } from "@/lib/types";
import { GlassmorphismLaunchTimelineBlock } from "./uitripled/glassmorphism-launch-timeline-block-shadcnui";
import { loadModelUsingOnnx, processImageUsingOnnx } from "@/lib/modelManager copy";

interface PredictionResult {
  fileName: string;
  prediction: predictionItem[];
  imageUrl: string;
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

        const model =await loadModelUsingOnnx();

        setStatus(ProcessStep.CLASSIFYING);

      // Process all images in parallel
      const predictions = await Promise.all(
        fileArray.map((file) => processImageUsingOnnx(file, model)),
      );

      setStatus(ProcessStep.SORTING);
      console.log("All predictions:", predictions);
      setResults(predictions);
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
          // create a new input element and trigger click
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
