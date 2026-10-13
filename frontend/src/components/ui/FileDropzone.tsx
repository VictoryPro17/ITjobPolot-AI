import { useState, type ChangeEvent, type DragEvent } from "react";
import { FileText, Loader2, Upload } from "lucide-react";

import { cn } from "@/lib/utils";

interface FileDropzoneProps {
  accept?: string;
  hint?: string;
  loading?: boolean;
  fileName?: string;
  disabled?: boolean;
  onFile: (file: File) => void;
}

export function FileDropzone({ accept, hint, loading, fileName, disabled, onFile }: FileDropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const inactive = Boolean(disabled || loading);

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragOver(true);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files[0];
    if (file && !inactive) {
      onFile(file);
    }
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      onFile(file);
    }
    event.target.value = "";
  }

  return (
    <label
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 px-6 py-8 text-center transition-colors hover:border-primary/50 hover:bg-primary/5",
        dragOver && "border-primary bg-primary/10",
        inactive && "pointer-events-none opacity-60",
      )}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <input type="file" className="sr-only" accept={accept} disabled={inactive} onChange={handleChange} />
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
      </span>
      {loading ? (
        <p className="text-sm font-medium">Lebenslauf wird gelesen…</p>
      ) : (
        <p className="text-sm font-medium">
          Datei hierher ziehen oder <span className="text-primary">auswählen</span>
        </p>
      )}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {fileName ? (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium">
          <FileText className="h-3.5 w-3.5" />
          {fileName}
        </span>
      ) : null}
    </label>
  );
}
