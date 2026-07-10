import { FileImage, FileText, FileType2, Presentation, ScrollText } from "lucide-react";
import type { LocalResource } from "../types";

export function ResourceFileIcon({ resource, size = "md" }: { resource: LocalResource; size?: "sm" | "md" | "lg" }) {
  const Icon = getIcon(resource.fileExtension);
  const className = size === "lg" ? "h-16 w-16 rounded-[24px]" : size === "sm" ? "h-10 w-10 rounded-[15px]" : "h-12 w-12 rounded-[18px]";
  const iconSize = size === "lg" ? 28 : size === "sm" ? 18 : 21;
  return (
    <span className={`grid shrink-0 place-items-center bg-cream text-ink ${className}`} aria-hidden="true">
      <Icon size={iconSize} strokeWidth={2.4} />
    </span>
  );
}

function getIcon(extension: string) {
  if (["jpg", "jpeg", "png", "webp"].includes(extension)) return FileImage;
  if (["ppt", "pptx"].includes(extension)) return Presentation;
  if (["doc", "docx"].includes(extension)) return FileType2;
  if (extension === "txt") return ScrollText;
  return FileText;
}
