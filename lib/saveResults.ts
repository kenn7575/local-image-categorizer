import { Task } from "./types";

export async function saveResults(tasks: Task[]): Promise<void> {
  const collectionId = Date.now().toString();

  // Batch upload: multipart/form-data with repeated "files" and "filePaths"
  const formData = new FormData();

  const reviewList = tasks.map((task) => {
    const filePath = task.file ? `${task.columnId}/${task.file.name}` : "";

    if (task.file) {
      formData.append("files", task.file);
      formData.append("filePaths", filePath);
    }

    return { ...task, filePath };
  });

  try {
    const res = await fetch("/api/files", { method: "POST", body: formData });

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
}