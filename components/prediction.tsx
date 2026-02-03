"use client";

import { useEffect, useState, ChangeEvent } from "react";
import * as tf from "@tensorflow/tfjs";

export default function PredictImage() {
  const [model, setModel] = useState<tf.GraphModel | null>(null);
  const [result, setResult] = useState<number[] | null>(null);

  // Load model once
  useEffect(() => {
    const loadModel = async () => {
      const m = await tf.loadGraphModel("/model/model.json");
      setModel(m);
    };

    loadModel();
  }, []);

  const handleImage = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !model) return;

    const img = new Image();
    img.src = URL.createObjectURL(file);

    console.log("Image loaded:", img);
    img.onload = async () => {
      const tensor = tf.browser
        .fromPixels(img)
        .resizeBilinear([150, 150])
        .toFloat()
        .div(255)
        .expandDims(0); // [1, 150, 150, 3]

    console.log("Tensor shape:", tensor.shape);
      const prediction = model.predict(tensor) as tf.Tensor;
      const data = await prediction.data();

      console.log("Prediction data:", data);

      setResult(Array.from(data));

      tf.dispose([tensor, prediction]);
    };
  };

  return (
    <>
      <input
        type="file"
        accept="image/*"
        onChange={handleImage}
        placeholder="Upload an image"
      />

      {result && (
        <pre>{JSON.stringify(result, null, 2)}</pre>
      )}
    </>
  );
}
