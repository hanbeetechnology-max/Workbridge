import { useRef } from "react";
import { Camera, Loader2 } from "lucide-react";

// A premium, light gradient fallback for anyone who hasn't set a custom
// cover yet — deliberately not another dark/solid banner, per the shift
// away from the old "internal dashboard" look toward a public, shareable
// profile page.
const DEFAULT_GRADIENT =
  "linear-gradient(120deg, #EEF2FF 0%, #F8FAFC 45%, #FFF1E9 100%)";

// Used on both the worker's own profile and (read-only, editable=false) the
// public/shareable view a business sees — same banner, same fallback, just
// without the upload control when someone else is looking at it.
export default function EditableCoverPhoto({
  coverUrl,
  onUpload,
  uploading = false,
  editable = true,
  heightClass = "h-40 sm:h-48",
  maxBytes = 3 * 1024 * 1024,
  onError,
}) {
  const inputRef = useRef(null);

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > maxBytes) {
      onError?.(`Cover image is too large — please choose one under ${Math.round(maxBytes / (1024 * 1024))}MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onUpload(reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <div
      className={`relative w-full flex-shrink-0 overflow-hidden ${heightClass}`}
      style={{
        backgroundImage: coverUrl ? `url(${coverUrl})` : DEFAULT_GRADIENT,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {!coverUrl && (
        <>
          <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-[#1B3FAB]/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-14 left-10 h-36 w-36 rounded-full bg-[#FF6B35]/10 blur-3xl" />
        </>
      )}

      {editable && (
        <>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="absolute right-4 top-4 flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm backdrop-blur transition hover:bg-white disabled:opacity-60"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            {uploading ? "Uploading…" : "Edit Banner"}
          </button>
        </>
      )}
    </div>
  );
}
