import { useEffect, useRef, useState } from "react";
import { Check, Loader2, X, ZoomIn } from "lucide-react";

const VIEWPORT = 280; // circular crop window, in CSS px
const OUTPUT_SIZE = 480; // exported square image, in px

// WhatsApp-style "pick which part of the photo is your profile picture"
// step between choosing a file and actually saving it — drag to reposition,
// slider to zoom, nothing leaves this modal until Save. baseScale is the
// zoom level at which the image just barely covers the circular viewport
// (same math as CSS object-fit:cover); the zoom slider multiplies on top of
// that floor so the image can never shrink smaller than the viewport and
// leave a gap at the edges.
export default function AvatarCropModal({ file, onCancel, onConfirm, saving = false }) {
  const [imageSrc, setImageSrc] = useState(null);
  const [naturalSize, setNaturalSize] = useState(null);
  const [baseScale, setBaseScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragState = useRef(null);

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result);
    reader.readAsDataURL(file);
  }, [file]);

  const handleImgLoad = (e) => {
    const { naturalWidth: w, naturalHeight: h } = e.target;
    setNaturalSize({ w, h });
    setBaseScale(Math.max(VIEWPORT / w, VIEWPORT / h));
    setOffset({ x: 0, y: 0 });
    setZoom(1);
  };

  const clampOffset = (next, scale) => {
    if (!naturalSize) return next;
    const displayedW = naturalSize.w * scale;
    const displayedH = naturalSize.h * scale;
    const maxX = Math.max(0, (displayedW - VIEWPORT) / 2);
    const maxY = Math.max(0, (displayedH - VIEWPORT) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  };

  const scale = baseScale * zoom;

  // Plain window-level mousemove/mouseup (not the Pointer Capture API) —
  // setPointerCapture is flaky inside some embedded webviews (VS Code's
  // Simple Browser among them), where the capture silently no-ops and drag
  // never fires past the first pixel. Listening on window instead is the
  // classic, universally-supported drag pattern: it keeps tracking the
  // cursor even once it leaves the circular viewport mid-drag.
  const startDrag = (clientX, clientY) => {
    dragState.current = { startX: clientX, startY: clientY, origin: offset };
  };

  useEffect(() => {
    const moveTo = (clientX, clientY) => {
      if (!dragState.current) return;
      const dx = clientX - dragState.current.startX;
      const dy = clientY - dragState.current.startY;
      setOffset(clampOffset({ x: dragState.current.origin.x + dx, y: dragState.current.origin.y + dy }, scale));
    };
    const handleMouseMove = (e) => moveTo(e.clientX, e.clientY);
    const handleTouchMove = (e) => {
      if (!e.touches[0]) return;
      moveTo(e.touches[0].clientX, e.touches[0].clientY);
    };
    const handleUp = () => {
      dragState.current = null;
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale, naturalSize]);

  const handleZoomChange = (nextZoomStr) => {
    const nextZoom = Number(nextZoomStr);
    setZoom(nextZoom);
    setOffset((prev) => clampOffset(prev, baseScale * nextZoom));
  };

  const handleConfirm = () => {
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      const outputScale = (scale * OUTPUT_SIZE) / VIEWPORT;
      const centerX = OUTPUT_SIZE / 2 + (offset.x * OUTPUT_SIZE) / VIEWPORT;
      const centerY = OUTPUT_SIZE / 2 + (offset.y * OUTPUT_SIZE) / VIEWPORT;
      ctx.save();
      ctx.beginPath();
      ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, centerX - (img.naturalWidth * outputScale) / 2, centerY - (img.naturalHeight * outputScale) / 2, img.naturalWidth * outputScale, img.naturalHeight * outputScale);
      ctx.restore();
      onConfirm(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.src = imageSrc;
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Adjust your photo</h2>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:text-slate-500 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          className="relative mx-auto flex touch-none items-center justify-center overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
          style={{ width: VIEWPORT, height: VIEWPORT, cursor: imageSrc ? "grab" : "default" }}
          onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
          onTouchStart={(e) => e.touches[0] && startDrag(e.touches[0].clientX, e.touches[0].clientY)}
        >
          {imageSrc && (
            <img
              src={imageSrc}
              alt=""
              onLoad={handleImgLoad}
              draggable={false}
              className="pointer-events-none select-none"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                transformOrigin: "center",
                width: naturalSize?.w ?? "auto",
                height: naturalSize?.h ?? "auto",
                maxWidth: "none",
              }}
            />
          )}
          {/* Static ring on top so the crop boundary always reads clearly
              against any photo, instead of relying on the container's own
              (clipped) edge. */}
          <div className="pointer-events-none absolute inset-0 rounded-full ring-4 ring-white/80 dark:ring-slate-900/80" />
        </div>

        <div className="mt-5 flex items-center gap-3">
          <ZoomIn className="h-4 w-4 flex-shrink-0 text-slate-400 dark:text-slate-500" />
          <input
            type="range"
            min="1"
            max="3"
            step="0.01"
            value={zoom}
            onChange={(e) => handleZoomChange(e.target.value)}
            disabled={!naturalSize}
            className="w-full accent-[#FF6B35]"
          />
        </div>
        <p className="mt-2 text-center text-xs text-slate-400 dark:text-slate-500">Drag to reposition, use the slider to zoom.</p>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving || !naturalSize}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#FF6B35] py-2.5 text-sm font-bold text-white transition hover:bg-[#e55a2b] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Save photo
          </button>
        </div>
      </div>
    </div>
  );
}
