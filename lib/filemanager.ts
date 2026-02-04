// This file is for saving image files to the right folder
import fs from "fs/promises";
import path from "path";
import { Task } from "./types";

const GALLERY_BASE_DIR = path.join(process.cwd(), "public", "gallery");

// Helper function to resolve paths relative to public/gallery
function resolveGalleryPath(relativePath: string): string {
  return path.join(GALLERY_BASE_DIR, relativePath);
}

export async function saveFile(file: File, filePath: string): Promise<void> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Resolve path relative to public/gallery
  const fullPath = resolveGalleryPath(filePath);

  // Ensure the directory exists
  const dir = path.dirname(fullPath);
  await fs.mkdir(dir, { recursive: true });

  // Write the file
  await fs.writeFile(fullPath, buffer);
}

export async function deleteFile(filePath: string): Promise<void> {
  const fullPath = resolveGalleryPath(filePath);
  await fs.unlink(fullPath);
}

export async function moveFile(
  oldPath: string,
  newPath: string,
): Promise<void> {
  const fullOldPath = resolveGalleryPath(oldPath);
  const fullNewPath = resolveGalleryPath(newPath);

  // Ensure the destination directory exists
  const dir = path.dirname(fullNewPath);
  await fs.mkdir(dir, { recursive: true });

  // Move the file
  await fs.rename(fullOldPath, fullNewPath);
}

export async function listFiles(directory: string): Promise<string[]> {
  const fullPath = resolveGalleryPath(directory);
  const entries = await fs.readdir(fullPath, { withFileTypes: true });
  return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
}

export async function listDirectories(directory: string): Promise<string[]> {
  const fullPath = resolveGalleryPath(directory);
  const entries = await fs.readdir(fullPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

export async function createDirectory(directory: string): Promise<void> {
  const fullPath = resolveGalleryPath(directory);
  await fs.mkdir(fullPath, { recursive: true });
}

export async function deleteDirectory(directory: string): Promise<void> {
  const fullPath = resolveGalleryPath(directory);
  await fs.rm(fullPath, { recursive: true, force: true });
}

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
