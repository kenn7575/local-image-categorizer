"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";

export function NavigationButtons() {
  const pathname = usePathname();

  const isGalleryActive = pathname === "/";
  const isUploadActive = pathname === "/upload";

  return (
    <ButtonGroup>
      <Button
        variant={isGalleryActive ? "default" : "secondary"}
        asChild
      >
        <Link href="/">Gallery</Link>
      </Button>
      <Button
        variant={isUploadActive ? "default" : "secondary"}
        asChild
      >
        <Link href="/upload">Upload</Link>
      </Button>
    </ButtonGroup>
  );
}
