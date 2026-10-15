import { useState } from "react";

import { cn } from "@/lib/utils";

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  if (words.length === 1) {
    return words[0][0].toUpperCase();
  }
  return "?";
}

interface AvatarProps {
  name: string;
  className?: string;
  src?: string;
  size?: "sm" | "lg";
}

export function Avatar({ name, className, src, size = "sm" }: AvatarProps) {
  // Fehlschlag je Bildadresse merken: Ein neues Bild wird automatisch wieder versucht.
  const [failedSrc, setFailedSrc] = useState<string>();
  const showImage = Boolean(src) && failedSrc !== src;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary-text",
        size === "lg" ? "h-20 w-20 text-2xl" : "h-8 w-8 text-xs",
        className,
      )}
    >
      {showImage ? (
        <img src={src} alt="" className="h-full w-full rounded-full object-cover" onError={() => setFailedSrc(src)} />
      ) : (
        getInitials(name)
      )}
    </span>
  );
}
