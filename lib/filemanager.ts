// This file is for saving image files to the right folder
import fs from "fs/promises";
import path from "path";

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
