import { useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/Badge";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  /** Id des Texteingabefelds, damit ein Label darauf verweisen kann. */
  id?: string;
}

export function TagInput({ value, onChange, placeholder, id }: TagInputProps) {
  const [draft, setDraft] = useState("");

  function addTags(rawValues: string[]) {
    const next = [...value];
    for (const raw of rawValues) {
      const tag = raw.trim();
      if (tag && !next.some((existing) => existing.toLowerCase() === tag.toLowerCase())) {
        next.push(tag);
      }
    }
    if (next.length !== value.length) {
      onChange(next);
    }
  }

  function commitDraft() {
    addTags([draft]);
    setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commitDraft();
    } else if (event.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData("text");
    if (text.includes(",")) {
      event.preventDefault();
      addTags(text.split(","));
      setDraft("");
    }
  }

  return (
    <div className="flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background p-1.5 shadow-xs transition-[border-color,box-shadow] hover:border-foreground/20 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20">
      {value.map((tag) => (
        <Badge key={tag} tone="primary">
          {tag}
          <button
            type="button"
            aria-label={`${tag} entfernen`}
            className="rounded-full hover:bg-primary/20"
            onClick={() => onChange(value.filter((item) => item !== tag))}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <input
        id={id}
        className="min-w-24 flex-1 bg-transparent px-1.5 text-sm outline-none placeholder:text-muted-foreground/70"
        value={draft}
        placeholder={placeholder}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={commitDraft}
      />
    </div>
  );
}
