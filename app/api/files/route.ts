import { NextRequest, NextResponse } from "next/server";
import { saveFile, deleteFile, moveFile, listFiles, listDirectories } from "@/lib/filemanager";
import { AllImageFiles } from "@/lib/types";

// POST - Save files (multipart/form-data)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const getAll = (keys: string[]) =>
      keys.flatMap((k) => formData.getAll(k)).filter(Boolean);

    const rawFiles = getAll(["files", "files[]", "file"]);
    const rawPaths = getAll(["filePaths", "filePaths[]", "filePath"]);

    const files = rawFiles.filter((v): v is File => v instanceof File);
    const filePaths = rawPaths
      .filter((v): v is string => typeof v === "string")
      .map((s) => s.trim())
      .filter(Boolean);

    if (files.length === 0 || filePaths.length === 0) {
      return NextResponse.json(
        {
          error: "files and filePaths are required",
          hint: "Send multipart/form-data with fields files + filePaths (or files[] + filePaths[]).",
        },
        { status: 400 },
      );
    }

    if (files.length !== filePaths.length) {
      return NextResponse.json(
        { error: "files and filePaths must have the same length" },
        { status: 400 },
      );
    }

    await Promise.all(files.map((file, i) => saveFile(file, filePaths[i])));

    return NextResponse.json({ success: true, paths: filePaths });
  } catch (error) {
    console.error("Error saving files:", error);
    return NextResponse.json(
      { error: "Failed to save files" },
      { status: 500 },
    );
  }
}

// DELETE - Delete a file
export async function DELETE(request: NextRequest) {
  try {
    const { filePath } = await request.json();

    if (!filePath) {
      return NextResponse.json(
        { error: "filePath is required" },
        { status: 400 },
      );
    }

    await deleteFile(filePath);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting file:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 },
    );
  }
}

// PUT - Move/rename a file
export async function PUT(request: NextRequest) {
  try {
    const { oldPath, newPath } = await request.json();

    if (!oldPath || !newPath) {
      return NextResponse.json(
        { error: "oldPath and newPath are required" },
        { status: 400 },
      );
    }

    await moveFile(oldPath, newPath);

    return NextResponse.json({ success: true, newPath });
  } catch (error) {
    console.error("Error moving file:", error);
    return NextResponse.json({ error: "Failed to move file" }, { status: 500 });
  }
}

// GET - get all files as a 
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const directory = searchParams.get("directory") || "";

    const directories = await listDirectories("");
    
    const files: AllImageFiles = {
      street: [],
      buildings: [],
      sea: [],
      mountain: [],
      glacier: [],
      forest: [],
    };

    await Promise.all(
      directories.map(async (dir) => {
        if (dir in files) {
          const fileList = await listFiles(dir);
          files[dir as keyof AllImageFiles] = fileList.map((f) => ({
            fileName: f,
            src: `/gallery/${dir}/${f}`,
            alt: f,
          }));
        }
      })
    );

    return NextResponse.json({ files });
  } catch (error) {
    console.error("Error listing files:", error);
    return NextResponse.json(
      { error: "Failed to list files" },
      { status: 500 },
    );
  }
}
