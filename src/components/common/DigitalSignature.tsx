import React, { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";

interface DigitalSignatureProps {
  onSave: (signature: string) => void;
  disabled?: boolean;
}

const DigitalSignature: React.FC<DigitalSignatureProps> = ({
  onSave,
  disabled = false,
}) => {
  const signatureRef = useRef<SignatureCanvas | null>(null);
  const [hasSignature, setHasSignature] = useState(false);

  const handleClear = () => {
    signatureRef.current?.clear();
    setHasSignature(false);
  };

  const handleSave = () => {
    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      return;
    }

    const signature = signatureRef.current
      .getTrimmedCanvas()
      .toDataURL("image/png");

    setHasSignature(true);
    onSave(signature);
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <SignatureCanvas
          ref={signatureRef}
          penColor="currentColor"
          canvasProps={{
            className:
              "h-48 w-full cursor-crosshair text-slate-900 dark:text-white",
          }}
          onEnd={() => setHasSignature(true)}
        />
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled || !hasSignature}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Clear
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={disabled || !hasSignature}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save Signature
        </button>
      </div>
    </div>
  );
};

export default DigitalSignature;