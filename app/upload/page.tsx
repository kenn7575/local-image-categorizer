"use client"
import PredictImage from "@/components/prediction";
import { KanbanBoard } from "@/components/uitripled/gallery-board";
import { PredictionResult } from "@/lib/types";
import { useState } from "react";

export default function UploadPage() {
  const [predictions, setPredictions] = useState<PredictionResult[]>([]);
  const [mode, setMode] = useState<"upload" | "review">("upload");

  return (
    <>
    {mode === "upload" ? (
      <PredictImage setPredictions={(predictions) => setPredictions(predictions)} setMode={setMode} />
    ) : (
      <KanbanBoard initialPredictions={predictions} setMode={setMode}/>
    )}
    </>
  );
}