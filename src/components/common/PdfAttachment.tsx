import { useRef } from "react";
import { FileText, Paperclip, X } from "lucide-react";

// ----------------------------------------------------
// Common PDF Attachment Component
// ----------------------------------------------------
// Reusable PDF attachment control.
// Validation remains in the shared Zod validation schema.
// This component only handles file selection/removal and UI.
// ----------------------------------------------------

export interface PdfAttachmentProps {
  file?: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
}

export function PdfAttachment({
  file,
  onChange,
  accept = "application/pdf",
}: PdfAttachmentProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFile = event.target.files?.[0] ?? null;
    onChange(selectedFile);
  };

  const handleRemove = () => {
    onChange(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="flex w-full items-center justify-between gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
      />

      {!file ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
        >
          <Paperclip className="h-3.5 w-3.5" />
          Attach PDF
        </button>
      ) : (
        <div className="flex min-w-0 items-center gap-1.5 text-xs">
          <FileText className="h-3.5 w-3.5 shrink-0 text-blue-600" />

          <span className="truncate font-medium text-slate-700 dark:text-slate-200">
            {file.name}
          </span>

          <button
            type="button"
            aria-label="Remove attachment"
            onClick={handleRemove}
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <span className="shrink-0 text-[11px] text-slate-400 dark:text-slate-500">
        Optional
      </span>
    </div>
  );
}

export default PdfAttachment;