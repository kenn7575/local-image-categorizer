"use client";
import { useEffect, useState, ChangeEvent } from "react";
import * as tf from "@tensorflow/tfjs";
import { predictionItem, PredictionResult } from "./types";

export const processImage = async (file: File, model: tf.GraphModel): Promise<PredictionResult> => {
  
  const labels: predictionItem["type"][] = [
    "buildings",
    "forest",
    "glacier",
    "mountain",
    "sea",
    "street",
  ];

  return new Promise((resolve, reject) => {
    const img = new Image();
    const imageUrl = URL.createObjectURL(file);
    img.src = imageUrl;

    img.onload = async () => {
      try {
        const tensor = tf.browser
          .fromPixels(img)
          .resizeBilinear([150, 150])
          .toFloat()
          .div(255)
          .expandDims(0); // [1, 150, 150, 3]

        console.log("Tensor shape:", tensor.shape);
        const prediction = model!.predict(tensor) as tf.Tensor;
        const data = await prediction.data();

        console.log("Prediction data for", file.name, data);

        tf.dispose([tensor, prediction]);

        resolve({
          fileName: file.name,
          prediction: Array.from(data).map((value, index) => ({
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

export const loadModel = async (modelUrl: string = "model/model.json"): Promise<tf.GraphModel> => {
  const model = await tf.loadGraphModel(modelUrl);
  return model;
}