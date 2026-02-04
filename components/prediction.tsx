"use client";

import { useEffect, useState, ChangeEvent } from "react";
import * as tf from "@tensorflow/tfjs";
import { loadModel, processImage } from "@/lib/modelManager_old";
import { predictionItem, PredictionResult, ProcessStep } from "@/lib/types";
import { GlassmorphismLaunchTimelineBlock } from "./uitripled/glassmorphism-launch-timeline-block-shadcnui";
import { loadModelUsingOnnx, processImageUsingOnnx } from "@/lib/modelManager";
import { pre } from "framer-motion/client";



export default function PredictImage({setPredictions, setMode}: {setPredictions: (predictions: PredictionResult[]) => void, setMode?: (mode: "upload" | "review") => void}) {

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

      // Process all images in parallel
      const predictions = await Promise.all(
        fileArray.map((file) => processImageUsingOnnx(file, model)),
      );

      setStatus(ProcessStep.SORTING);
      console.log("All predictions:", predictions);
      setPredictions(predictions);
    } catch (error) {
      console.error("Error processing images:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const saveResults = async (predictions: PredictionResult[]) => {
    // save all results to the dir coreasponding to the highest certainty
    // then navigate to the /review?collection=xyz page

    setStatus(ProcessStep.SORTING);
    const collectionId = Date.now().toString();

    // Save all files using the API
    await Promise.all(
      predictions.map(async (prediction) => {
        if (!prediction.file) return;

        // Get the top prediction (first item has highest certainty)
        const topPrediction = prediction.prediction[0];
        const filePath = `sorted/${collectionId}/${topPrediction.type}/${prediction.file.name}`;

        const formData = new FormData();
        formData.append("file", prediction.file);
        formData.append("filePath", filePath);

        try {
          await fetch("/api/files", {
            method: "POST",
            body: formData,
          });
        } catch (error) {
          console.error(`Failed to save ${prediction.fileName}:`, error);
        }
      }),
    );

    setStatus(ProcessStep.SORTING);

    // next make a list and save to local storage along with a unique collection id

    const reviewList = predictions.map((prediction) => ({
      ...prediction,
      filePath: prediction.file
        ? `sorted/${collectionId}/${prediction.file.name}`
        : "",
    }));

    localStorage.setItem(
      "reviewCollection_" + collectionId,
      JSON.stringify(reviewList),
    );
  };

  return (
    <>
      {isProcessing && <p>Processing images...</p>}
      <GlassmorphismLaunchTimelineBlock
        triggerReview={() => {
          if (setMode) {setMode("review")   } else {
            console.warn("setMode is not provided");
          }
        }}
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
