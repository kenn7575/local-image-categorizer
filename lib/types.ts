export interface PredictionResult {
  fileName: string;
  prediction: predictionItem[];
  imageUrl: string;
}

export interface predictionItem{
    type: "buildings" | "forest" | "glacier" | "mountain" | "sea" |  "street"
    certainty: number;
}

export const enum ProcessStep {
  BEFORE_UPLOAD = "before_upload",
  IMPORTING = "importing",
  LOADING_MODEL = "loading_model",
  CLASSIFYING = "classifying",
  SORTING = "done_sorting",
}