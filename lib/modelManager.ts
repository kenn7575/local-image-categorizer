"use client";

import * as ort from "onnxruntime-web";
import { predictionItem, PredictionResult } from "./types";

let labels: predictionItem["type"][] = [];

export const processImageUsingOnnx = async (
  file: File,
  model: ort.InferenceSession,
): Promise<PredictionResult> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const imageUrl = URL.createObjectURL(file);
    img.src = imageUrl;

    img.onload = async () => {
      try {
        // Create a canvas to get image data
        const canvas = document.createElement("canvas");
        canvas.width = 150;
        canvas.height = 150;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, 150, 150);

        // Get image data and convert to tensor format
        const imageData = ctx.getImageData(0, 0, 150, 150);
        const { data } = imageData;

        // Convert RGBA to RGB and normalize [0, 255] -> [0, 1]
        const input = new Float32Array(1 * 3 * 150 * 150);
        for (let i = 0; i < 150 * 150; i++) {
          input[i] = data[i * 4] / 255.0; // R
          input[150 * 150 + i] = data[i * 4 + 1] / 255.0; // G
          input[150 * 150 * 2 + i] = data[i * 4 + 2] / 255.0; // B
        }

        const tensor = new ort.Tensor("float32", input, [1, 3, 150, 150]);

        console.log("Tensor shape:", tensor.dims);
        const feeds = { [model.inputNames[0]]: tensor };
        const results = await model.run(feeds);
        const outputTensor = results[model.outputNames[0]];
        const outputData = outputTensor.data as Float32Array;

        console.log("Prediction data for", file.name, outputData);

        resolve({
          fileName: file.name,
          prediction: Array.from(outputData).map((value, index) => ({
            type: labels[index],
            certainty: value,
          })) as predictionItem[],
          imageUrl,
        });
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error("Failed to load image"));
  });
};

export const loadModelUsingOnnx = async (
  modelUrl: string = "/model/model.onnx",
): Promise<ort.InferenceSession> => {
  // Load labels from JSON file
  const labelsResponse = await fetch("/model/labels.json");
  labels = await labelsResponse.json();

  // Load ONNX model with external data
  const modelResponse = await fetch(modelUrl);
  const modelBuffer = await modelResponse.arrayBuffer();

  // Load external data file
  const externalDataResponse = await fetch("/model/model.onnx.data");
  const externalDataBuffer = await externalDataResponse.arrayBuffer();

  // Create session with external data
  ort.env.wasm.wasmPaths =
    "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/";

  const model = await ort.InferenceSession.create(modelBuffer, {
    executionProviders: ["wasm"],
    externalData: [
      {
        data: new Uint8Array(externalDataBuffer),
        path: "model.onnx.data",
      },
    ],
  });

  return model;
};
