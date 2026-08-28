import { useRef } from "react";
import { Paperclip, X } from "lucide-react";

const MAX_ITEMS = 3;
const MAX_BYTES = 4 * 1024 * 1024; // ~4MB decoded — mirrors backend's disputeEvidence.js cap

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Small evidence-photo picker shared by the raise-dispute and
// submit-rebuttal modals — up to 3 images, same shape both server
// endpoints expect ({ dataUrl, caption }). Not a general file uploader:
// no PDFs, no drag-and-drop, just "attach a screenshot" kept as simple as
// the actual use case (proof of a claim, not a document vault).
export default function DisputeEvidenceUpload({ items, onChange, disabled }) {
  const inputRef = useRef(null);

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList).slice(0, MAX_ITEMS - items.length);
    const accepted = [];
    for (const file of files) {
      if (file.size > MAX_BYTES) continue; // silently skip oversized — the caption-less thumbnail grid has no room for a per-file error state
      if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) continue;
      const dataUrl = await readAsDataUrl(file);
      accepted.push({ dataUrl, caption: "" });
    }
    if (accepted.length) onChange([...items, ...accepted]);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {items.map((item, index) => (
          <div key={index} className="group relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
            <img src={item.dataUrl} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
              aria-label="Remove evidence"
              className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {items.length < MAX_ITEMS && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className="flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 text-slate-400 transition-colors hover:border-slate-400 hover:text-slate-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-500"
          >
            <Paperclip className="h-4 w-4" />
            <span className="text-[10px] font-semibold">Attach</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="hidden"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
      />
      <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">Up to {MAX_ITEMS} screenshots, 4MB each (optional).</p>
    </div>
  );
}
