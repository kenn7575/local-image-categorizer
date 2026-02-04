export interface PredictionResult {
  fileName: string;
  prediction: predictionItem[];
  imageUrl: string;
}



export const enum ProcessStep {
  BEFORE_UPLOAD = "before_upload",
  IMPORTING = "importing",
  LOADING_MODEL = "loading_model",
  CLASSIFYING = "classifying",
  SORTING = "done_sorting",
}

export interface AllImageFiles{
  street: PublicImage[];
  buildings: PublicImage[];
  sea: PublicImage[];
  mountain: PublicImage[];
  glacier: PublicImage[];
  forest: PublicImage[];
}

export interface PublicImage {
  fileName: string;
  src: string; // "/images/avatar.png"
  alt?: string;
  width?: number;
  height?: number;
}

export interface predictionItem{
    type: "buildings" | "forest" | "glacier" | "mountain" | "sea" |  "street"
    certainty: number;
}
export interface PredictionResult {
  fileName: string;
  prediction: predictionItem[];
  imageUrl: string;
  file?: File;
}

// for board
export type Id = string | number;
export type Column = {
  id: Id;
  title: string;
};

export interface Task extends PredictionResult {
  id: Id;
  columnId: Id;
}