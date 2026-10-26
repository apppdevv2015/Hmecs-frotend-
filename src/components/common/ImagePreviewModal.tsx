import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ImagePreviewModalProps {
  imageUrl: string;
  onClose: () => void;
}

export default function ImagePreviewModal({
  imageUrl,
  onClose,
}: ImagePreviewModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    setZoom(1);
  }, [imageUrl]);

  return createPortal(
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close image preview"
        className="absolute right-4 top-4 z-20 rounded-full bg-black/60 p-2 text-white transition hover:bg-black/80"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Image */}
      <div className="flex max-h-[90vh] max-w-[95vw] items-center justify-center">
        <img
          src={imageUrl}
          alt="Attachment preview"
          className="max-h-[90vh] max-w-[95vw] object-contain transition-transform duration-200"
          style={{
            transform: `scale(${zoom})`,
          }}
        />
      </div>

      {/* Zoom controls - fixed at bottom */}
      <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-xl bg-black/70 p-1.5 backdrop-blur-sm">
        <button
          type="button"
          onClick={() =>
            setZoom((prev) => Math.min(prev + 0.25, 3))
          }
          aria-label="Zoom in"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-lg font-bold text-white transition hover:bg-white/20"
        >
          +
        </button>

        <button
          type="button"
          onClick={() =>
            setZoom((prev) => Math.max(prev - 0.25, 0.5))
          }
          aria-label="Zoom out"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-lg font-bold text-white transition hover:bg-white/20"
        >
          −
        </button>

        <button
          type="button"
          onClick={() => setZoom(1)}
          aria-label="Reset zoom"
          className="rounded-lg px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
        >
          Reset
        </button>
      </div>
    </div>,
    document.body
  );
}