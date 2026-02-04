import { NextRequest, NextResponse } from "next/server";
import { saveFile, deleteFile, moveFile, listFiles, listDirectories } from "@/lib/filemanager";
import { AllImageFiles } from "@/lib/types";

// POST - Save a file
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const filePath = formData.get("filePath") as string;

    if (!file || !filePath) {
      return NextResponse.json(
        { error: "File and filePath are required" },
        { status: 400 },
      );
    }

    await saveFile(file, filePath);

    return NextResponse.json({ success: true, path: filePath });
  } catch (error) {
    console.error("Error saving file:", error);
    return NextResponse.json({ error: "Failed to save file" }, { status: 500 });
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
