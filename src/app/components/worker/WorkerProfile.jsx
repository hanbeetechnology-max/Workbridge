import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import {
  AlertCircle,
  Award,
  Briefcase,
  Camera,
  ExternalLink,
  FileCheck2,
  GraduationCap,
  Loader2,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Save,
  ShieldCheck,
  Star,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { updateOwnProfile } from "../../lib/profilesApi";
import { INDIAN_CITIES } from "../../lib/indianCities";
import { listReviewsFor } from "../../lib/reviewsApi";
import { getMyProfileAudits } from "../../lib/perksApi";
import { getInitials } from "../../utils/formValidation";
import { calculateLevel, calculateProgressBar, getNextTier, getTierData } from "../../utils/gamification";
import PinnedBadgeOverlay from "../shared/PinnedBadgeOverlay";
import EconomyInfoTooltip from "../shared/EconomyInfoTooltip";
import SharedSkillPicker from "../shared/SharedSkillPicker";
import { ApiError } from "../../lib/apiClient";
import { getSocket } from "../../lib/socketClient";
import EditableCoverPhoto from "../shared/EditableCoverPhoto";
import AvatarCropModal from "../shared/AvatarCropModal";
import ShareProfileButton from "../shared/ShareProfileButton";
import ImageLightbox from "../shared/ImageLightbox";
import { shouldShowFrame, verifiedRingClass } from "../../utils/verification";

const MAX_AVATAR_BYTES = 1.5 * 1024 * 1024; // 1.5MB — stored as a data URL in avatar_url (TEXT), no file-storage backend exists yet.

const defaultAvatarUrl =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 160'%3E%3Crect width='160' height='160' rx='80' fill='%231B3FAB'/%3E%3Ccircle cx='80' cy='62' r='28' fill='%23ffffff' opacity='0.95'/%3E%3Cpath d='M34 137c7-28 25-43 46-43s39 15 46 43' fill='%23ffffff' opacity='0.95'/%3E%3C/svg%3E";

function ProfileCard({ children, className = "" }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      {children}
    </section>
  );
}

// One section shape for the whole Edit Profile modal — an icon + real
// heading (not just another field label at the same visual weight as
// "Title"/"Location"), a top divider so sections read as distinct blocks
// instead of one long undifferentiated stack, and a proper pill "+Add"
// button instead of a bare text link.
function EditSection({ icon: Icon, title, onAdd, addLabel, last = false, children }) {
  return (
    <div className={`${last ? "" : "mb-8 border-b border-slate-100 dark:border-slate-800 pb-8"}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <Icon className="h-4 w-4 text-[#1B3FAB] dark:text-blue-400" />
          {title}
        </h3>
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 transition hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            <Plus className="h-3.5 w-3.5" />
            {addLabel}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function EmptySectionHint({ text }) {
  return <p className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-xs text-slate-400 dark:text-slate-500 dark:border-slate-700">{text}</p>;
}

function ReviewCard({ review }) {
  return (
    <article className="rounded-lg bg-slate-50 p-5 ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
      <div className="flex items-center gap-3">
        {review.reviewer_avatar_url ? (
          <img
            src={review.reviewer_avatar_url}
            alt={review.reviewer_name}
            className="h-11 w-11 flex-shrink-0 rounded-full object-cover shadow-sm"
          />
        ) : (
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-700 dark:text-slate-200 shadow-sm dark:bg-slate-700">
            {getInitials(review.reviewer_name)}
          </div>
        )}
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{review.reviewer_name}</h3>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {new Date(review.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-0.5 text-amber-400">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star key={index} className={`h-4 w-4 ${index < review.rating ? "fill-current" : "text-slate-200"}`} />
        ))}
      </div>
      {review.feedback && <p className="mt-4 text-sm italic leading-6 text-slate-500 dark:text-slate-400">"{review.feedback}"</p>}
    </article>
  );
}

function BehaviorLevelBento({ behaviorScore, verified }) {
  const navigate = useNavigate();
  const { currentUser, setShowVerificationFrame } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const score = behaviorScore ?? 0;
  const pct = Math.max(0, Math.min(100, Math.round((score / 1000) * 100)));
  const tier = score >= 750 ? "Elite" : score >= 500 ? "Trusted" : "Building Trust";

  return (
    <section className="relative z-30 mt-6 rounded-lg bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] dark:bg-slate-900">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            Trust &amp; Behavior Level
            <EconomyInfoTooltip title="How Behavior Score works">
              <p>Starts at 1000 and moves from your real conduct as a freelancer — not your skill or job outcomes.</p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                <li>+15 for answering the pre-application quiz honestly when you apply</li>
                <li>-5 if you skip the quiz and apply directly instead</li>
                <li>WorkBridge staff can deduct points for real policy violations (e.g. trying to move payment off-platform)</li>
              </ul>
            </EconomyInfoTooltip>
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{tier}</h2>
        </div>
        <p className="text-lg font-bold text-slate-900 dark:text-white">{score} / 1000 Score</p>
      </div>
      <div className="mt-3 h-4 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-400 to-[#FF6B35] transition-all duration-1000 ease-out"
          style={{ width: mounted ? `${pct}%` : "0%" }}
        />
      </div>
      {verified ? (
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-1.5 text-sm leading-6 text-slate-500 dark:text-slate-400">
            <ShieldCheck className="h-4 w-4 flex-shrink-0 text-emerald-500 dark:text-emerald-400" />
            Identity verified
          </p>
          {/* Stealth Mode — only reachable at all once verified is real and
              true, since there's nothing to toggle for someone who hasn't
              earned a frame yet. */}
          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            Display Verification Frame
            <span className="relative inline-flex flex-shrink-0">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={currentUser?.showVerificationFrame !== false}
                onChange={() => setShowVerificationFrame(currentUser?.showVerificationFrame === false)}
              />
              <span className="h-6 w-11 rounded-full bg-slate-300 transition-colors peer-checked:bg-[#FF6B35] dark:bg-slate-700" />
              <span className="absolute left-[2px] top-[2px] h-5 w-5 rounded-full border border-slate-300 bg-white shadow transition-transform peer-checked:translate-x-full dark:border-slate-500" />
            </span>
          </label>
        </div>
      ) : (
        // Real, non-fabricated CTA — Worker ID Verified is genuinely free
        // right now (VerificationFeesTable.jsx's launch-offer price), so
        // this doesn't invent a number the way the old "coming soon" text
        // at least didn't, but a passive line also didn't act like an ad.
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-4 flex flex-col items-start gap-3 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <p className="text-sm leading-6 text-slate-200">
              Verify your identity to unlock the Trust Frame on your profile and build credibility with businesses.
            </p>
          </div>
          <button
            type="button"
            onClick={() => toast.info("Identity verification is coming soon.")}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-xl bg-[#FF6B35] px-4 py-2.5 text-xs font-bold text-white transition-all duration-200 hover:bg-[#E85D2A] hover:shadow-lg active:scale-[0.98]"
          >
            Get Verified — Free
          </button>
        </motion.div>
      )}
    </section>
  );
}

export default function WorkerProfile() {
  const { currentUser, updateCurrentUser } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  // Real request history behind the "Skill Bridge Profile Audit" perk (see
  // WorkerTokenShop.jsx / AdminAuditsTab.jsx) — only the latest one is
  // shown, since a new purchase always starts a fresh PENDING request.
  const [profileAudits, setProfileAudits] = useState([]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    title: currentUser?.title ?? "",
    phone: currentUser?.phone ?? "",
    bio: currentUser?.profile?.bio ?? "",
    location: currentUser?.profile?.location ?? "",
    hourlyRate: currentUser?.profile?.hourlyRate ?? "",
    skills: currentUser?.profile?.skills ?? [],
    education: currentUser?.profile?.education ?? [],
    certifications: currentUser?.profile?.certifications ?? [],
    projects: currentUser?.profile?.projects ?? [],
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [coverError, setCoverError] = useState("");
  const [coverUploading, setCoverUploading] = useState(false);
  const [avatarPreviewOpen, setAvatarPreviewOpen] = useState(false);
  const [avatarCropFile, setAvatarCropFile] = useState(null);

  useEffect(() => {
    if (!currentUser?.id) return;
    listReviewsFor(currentUser.id)
      .then(setReviews)
      .catch(() => setReviews([]))
      .finally(() => setReviewsLoading(false));
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id) return;
    getMyProfileAudits()
      .then(setProfileAudits)
      .catch(() => setProfileAudits([]));
  }, [currentUser?.id]);

  // A business rating this worker mid-session (this tab already open)
  // previously only showed up after a manual reload — the fetch above only
  // ever ran once, on mount.
  useEffect(() => {
    if (!currentUser?.id) return undefined;
    const socket = getSocket();
    if (!socket) return undefined;

    const handleProjectEvent = (event) => {
      if (event.type === "REVIEW_SUBMITTED" && event.revieweeId === currentUser.id) {
        listReviewsFor(currentUser.id).then(setReviews).catch(() => {});
      }
    };

    socket.on("project:event", handleProjectEvent);
    return () => socket.off("project:event", handleProjectEvent);
  }, [currentUser?.id]);

  const startEdit = () => {
    setDraft({
      title: currentUser?.title ?? "",
      phone: currentUser?.phone ?? "",
      bio: currentUser?.profile?.bio ?? "",
      location: currentUser?.profile?.location ?? "",
      hourlyRate: currentUser?.profile?.hourlyRate ?? "",
      skills: currentUser?.profile?.skills ?? [],
      education: currentUser?.profile?.education ?? [],
      certifications: currentUser?.profile?.certifications ?? [],
      projects: currentUser?.profile?.projects ?? [],
    });
    setSaveError("");
    setEditing(true);
  };

  // Shared by the Education/Certifications/Projects repeatable-list editors
  // below — each is just an array of plain objects living on `draft[field]`.
  const addDraftListItem = (field, blank) => {
    setDraft((d) => ({ ...d, [field]: [...d[field], blank] }));
  };
  const updateDraftListItem = (field, index, patch) => {
    setDraft((d) => ({
      ...d,
      [field]: d[field].map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  };
  const removeDraftListItem = (field, index) => {
    setDraft((d) => ({ ...d, [field]: d[field].filter((_, i) => i !== index) }));
  };

  // Same data-URL pattern as the avatar/cover uploads above — no dedicated
  // file-storage backend exists yet, so the certificate file is stored
  // inline as a data URL on the certification entry itself.
  const [certFileError, setCertFileError] = useState({});
  const handleCertificateFileChange = (index, event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setCertFileError((prev) => ({ ...prev, [index]: "" }));
    if (file.size > MAX_AVATAR_BYTES) {
      setCertFileError((prev) => ({ ...prev, [index]: "File is too large — please choose one under 1.5MB." }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateDraftListItem("certifications", index, { fileUrl: reader.result, fileName: file.name });
    };
    reader.readAsDataURL(file);
  };

  const saveEdit = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const phone = draft.phone.replace(/\D/g, "");
      if (phone && phone.length !== 10) {
        setSaveError("Phone number must be exactly 10 digits.");
        setSaving(false);
        return;
      }
      const updated = await updateOwnProfile({
        title: draft.title.trim() || undefined,
        phone: phone || undefined,
        profilePatch: {
          bio: draft.bio.trim(),
          location: draft.location.trim(),
          hourlyRate: draft.hourlyRate ? Number(draft.hourlyRate) : null,
          skills: draft.skills,
          education: draft.education
            .map((e) => ({ degree: e.degree?.trim() ?? "", school: e.school?.trim() ?? "", year: e.year?.trim() ?? "" }))
            .filter((e) => e.degree || e.school),
          certifications: draft.certifications
            .map((c) => ({
              name: c.name?.trim() ?? "",
              issuer: c.issuer?.trim() ?? "",
              year: c.year?.trim() ?? "",
              fileUrl: c.fileUrl || undefined,
              fileName: c.fileName || undefined,
            }))
            .filter((c) => c.name),
          projects: draft.projects
            .map((p) => ({ title: p.title?.trim() ?? "", link: p.link?.trim() ?? "", description: p.description?.trim() ?? "" }))
            .filter((p) => p.title),
        },
      });
      updateCurrentUser(updated);
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setAvatarError("");
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError("Image is too large — please choose one under 1.5MB.");
      return;
    }

    // Hands off to AvatarCropModal (WhatsApp-style reposition/zoom) instead
    // of uploading the raw file straight away — handleCropConfirm below is
    // what actually saves it once the user picks the visible circle.
    setAvatarCropFile(file);
  };

  const handleCropConfirm = async (dataUrl) => {
    setAvatarUploading(true);
    try {
      const updated = await updateOwnProfile({ avatarUrl: dataUrl });
      updateCurrentUser(updated);
      setAvatarCropFile(null);
    } catch (err) {
      setAvatarError(err instanceof ApiError ? err.message : "Could not upload photo.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleRemoveAvatar = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    setAvatarError("");
    setAvatarUploading(true);
    try {
      const updated = await updateOwnProfile({ avatarUrl: null });
      updateCurrentUser(updated);
    } catch (err) {
      setAvatarError(err instanceof ApiError ? err.message : "Could not remove photo.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleCoverUpload = async (dataUrl) => {
    setCoverError("");
    setCoverUploading(true);
    try {
      const updated = await updateOwnProfile({ profilePatch: { coverUrl: dataUrl } });
      updateCurrentUser(updated);
    } catch (err) {
      setCoverError(err instanceof ApiError ? err.message : "Could not upload cover photo.");
    } finally {
      setCoverUploading(false);
    }
  };

  const shareUrl = currentUser?.id ? `${window.location.origin}/profiles/${currentUser.id}` : undefined;

  // MASTER_ECONOMY_PLAN.md Part 5a — tier NAME and progress % only, never
  // a raw XP number or fee percentage in the UI copy.
  const { currentLevel } = calculateLevel(currentUser?.xp ?? 0);
  const { tier } = getTierData(currentLevel);
  const progressPct = calculateProgressBar(currentUser?.xp ?? 0);
  const nextTier = getNextTier(currentLevel);

  const profile = currentUser?.profile ?? {};
  const skills = profile.skills ?? [];
  const education = profile.education ?? [];
  const certifications = profile.certifications ?? [];
  const projects = profile.projects ?? [];

  return (
    <div className="wb-scroll-clean h-full overflow-y-auto overflow-x-hidden bg-[#F8FAFC] dark:bg-slate-950">
      <main className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 pb-20 text-slate-900 dark:text-white">
        <div className="w-full px-4 pt-8">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_55px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900">
            <EditableCoverPhoto
              coverUrl={profile.coverUrl}
              onUpload={handleCoverUpload}
              uploading={coverUploading}
              onError={setCoverError}
            />
            <div className="px-6 pb-7 sm:px-8">
              <div className="relative z-10 -mt-14 flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] lg:flex-row lg:items-start lg:justify-between dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="worker-avatar-upload"
                    onChange={handleImageUpload}
                    disabled={avatarUploading}
                  />
                  <label
                    htmlFor="worker-avatar-upload"
                    className="group relative h-28 w-28 flex-none cursor-pointer"
                    aria-label={`Update profile photo for ${currentUser?.name}`}
                    title="Update profile photo"
                  >
                    {currentUser?.avatar_url ? (
                      <img
                        src={currentUser.avatar_url}
                        alt={`${currentUser.name} profile`}
                        // preventDefault stops this click from bubbling into
                        // the parent <label>'s default action (opening the
                        // file picker) — clicking the photo itself should
                        // view it full-size; the hover camera icon overlay
                        // (unchanged) is still what triggers an upload.
                        onClick={(e) => { e.preventDefault(); setAvatarPreviewOpen(true); }}
                        className={`h-28 w-28 rounded-full border-4 border-white object-cover shadow-lg ${verifiedRingClass(shouldShowFrame(currentUser?.verified, currentUser), "md", "emerald")}`}
                      />
                    ) : (
                      <img
                        src={defaultAvatarUrl}
                        alt="Default profile"
                        className={`h-28 w-28 rounded-full border-4 border-white object-cover shadow-lg ${verifiedRingClass(shouldShowFrame(currentUser?.verified, currentUser), "md", "emerald")}`}
                      />
                    )}
                    <span className="absolute bottom-2 right-2 h-5 w-5 rounded-full border-4 border-white bg-emerald-500 shadow-[0_0_0_5px_rgba(16,185,129,0.16)]" />
                    <PinnedBadgeOverlay
                      level={currentUser?.pinned_milestone_level}
                      size="md"
                      className="-bottom-3 -left-3"
                    />
                    <span className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-950/55 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      {avatarUploading ? (
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      ) : (
                        <Camera className="h-6 w-6 text-white" />
                      )}
                    </span>
                    {currentUser?.avatar_url && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        disabled={avatarUploading}
                        aria-label="Remove photo and reset to default"
                        title="Remove photo"
                        className="absolute -right-1 -top-1 z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-rose-500 text-white shadow-md transition hover:bg-rose-600 disabled:opacity-60"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </label>
                  <div className="pb-1">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">{currentUser?.name}</h1>
                    <p className="mt-1 text-lg font-medium text-slate-500 dark:text-slate-400">{currentUser?.title || "Freelancer"}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm font-medium text-slate-500 dark:text-slate-400">
                      {profile.location && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                          {profile.location}
                        </span>
                      )}
                      {currentUser?.phone && (
                        <span className="inline-flex items-center gap-1.5">
                          <Phone className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                          +91 {currentUser.phone}
                        </span>
                      )}
                      {currentUser?.rating != null && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 font-bold text-amber-700 ring-1 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-900/40">
                          <Star className="h-3.5 w-3.5 fill-current" />
                          {currentUser.rating} ({currentUser.reviews_count} reviews)
                        </span>
                      )}
                    </div>
                    <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                      {profile.bio || "No bio yet — add one so businesses know who they're hiring."}
                    </p>

                    {/* MASTER_ECONOMY_PLAN.md Part 5a — a thin, understated
                        line (not a chunky game-style bar), tier name only,
                        never a raw XP count or fee percentage. */}
                    <div className="mt-5 max-w-md">
                      <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#FF6B35] to-yellow-500 transition-all duration-1000 ease-out"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <p className="mt-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Current Tier: <span className="text-slate-700 dark:text-slate-200">{tier}</span>
                        {nextTier && ` · Progress to ${nextTier.tier} Tier`}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <ShareProfileButton
                    url={shareUrl}
                    title={currentUser?.name}
                    text={`Check out ${currentUser?.name}'s profile on WorkBridge`}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                  />
                  <button
                    type="button"
                    onClick={startEdit}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1B3FAB] px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#15338d] dark:bg-gradient-to-r dark:from-[#16327A] dark:to-[#2b52d6] dark:hover:from-[#1B3FAB] dark:hover:to-[#3a63e0]"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit Profile
                  </button>
                </div>
              </div>
              {(avatarError || coverError) && (
                <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-red-500 dark:text-red-400">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {avatarError || coverError}
                </p>
              )}
            </div>
          </section>

          <BehaviorLevelBento behaviorScore={currentUser?.behavior_score} verified={currentUser?.verified} />

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(280px,3fr)]">
            <div className="space-y-8">
              <ProfileCard>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Projects</h2>
                {projects.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-400 dark:text-slate-500">No projects added yet — click Edit Profile to showcase your work.</p>
                ) : (
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {projects.map((p, index) => (
                      <article key={index} className="rounded-lg bg-slate-50 p-5 ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{p.title}</h3>
                        {p.description && <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{p.description}</p>}
                        {p.link && (
                          <a
                            href={p.link}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#1B3FAB] dark:text-blue-400 hover:underline"
                          >
                            View project <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </ProfileCard>

              <ProfileCard>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Education</h2>
                {education.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-400 dark:text-slate-500">No education added yet — click Edit Profile to add some.</p>
                ) : (
                  <div className="mt-4 space-y-4">
                    {education.map((entry, index) => (
                      <div
                        key={index}
                        className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 last:border-0 last:pb-0"
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{entry.degree}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{entry.school}</p>
                        </div>
                        {entry.year && <span className="flex-shrink-0 text-xs font-semibold text-slate-400 dark:text-slate-500">{entry.year}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </ProfileCard>

              <ProfileCard>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Courses &amp; Certifications</h2>
                {certifications.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-400 dark:text-slate-500">No certifications added yet — click Edit Profile to add some.</p>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {certifications.map((c, index) => (
                      <div key={index} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{c.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{[c.issuer, c.year].filter(Boolean).join(" · ")}</p>
                        {c.fileUrl && (
                          <a
                            href={c.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-[#1B3FAB] dark:text-blue-400 hover:underline"
                          >
                            View certificate <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ProfileCard>

              {profileAudits.length > 0 && (
                <ProfileCard>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Skill Bridge Profile Audit</h2>
                  {profileAudits[0].status === "PENDING" ? (
                    <p className="mt-3 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                      <span className="h-2 w-2 flex-shrink-0 rounded-full bg-amber-400" />
                      Your resume &amp; portfolio review is in the queue — WorkBridge staff will post feedback here.
                    </p>
                  ) : (
                    <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50/70 p-4 dark:border-violet-900/40 dark:bg-violet-500/10">
                      <p className="text-xs font-bold uppercase tracking-wide text-violet-500 dark:text-violet-400">
                        Reviewed {new Date(profileAudits[0].resolved_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">{profileAudits[0].admin_note}</p>
                    </div>
                  )}
                </ProfileCard>
              )}

              <ProfileCard>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Client Reviews</h2>
                {reviewsLoading ? (
                  <div className="mt-6 flex justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-[#1B3FAB] dark:border-slate-700" />
                  </div>
                ) : reviews.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-400 dark:text-slate-500">No reviews yet — they'll show up here once a project completes.</p>
                ) : (
                  <div className="mt-5 grid gap-5 md:grid-cols-2">
                    {reviews.map((review) => (
                      <ReviewCard key={review.id} review={review} />
                    ))}
                  </div>
                )}
              </ProfileCard>
            </div>

            <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
              <ProfileCard>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Skills</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {skills.length === 0 ? (
                    <p className="text-sm text-slate-400 dark:text-slate-500">No skills added yet.</p>
                  ) : (
                    skills.map((skill) => (
                      <span key={skill} className="rounded-full bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 dark:bg-slate-800">
                        {skill}
                      </span>
                    ))
                  )}
                </div>
                {profile.hourlyRate && (
                  <p className="mt-4 text-sm font-bold text-slate-700 dark:text-slate-200">₹{Number(profile.hourlyRate).toLocaleString("en-IN")}/hr</p>
                )}
              </ProfileCard>
            </aside>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {editing && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
          <motion.div
            className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Edit Profile</h2>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="wb-scroll-clean min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">
              {saveError && (
                <div className="mb-6 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{saveError}</span>
                </div>
              )}

              <EditSection icon={User} title="Basic Info">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Title</span>
                    <input
                      value={draft.title}
                      onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                      placeholder="e.g. Full-Stack Developer"
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-[#1B3FAB] focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Location</span>
                    <input
                      value={draft.location}
                      onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
                      placeholder="e.g. Mumbai, India"
                      list="worker-location-suggestions"
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-[#1B3FAB] focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800"
                    />
                    <datalist id="worker-location-suggestions">
                      {INDIAN_CITIES.map((city) => (
                        <option key={city} value={city} />
                      ))}
                    </datalist>
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Mobile Number</span>
                    <p className="mb-1.5 mt-1 text-xs text-slate-400 dark:text-slate-500">Kept up to date so the WorkBridge support team can reach you.</p>
                    <div className="flex gap-2">
                      <span className="flex h-10 items-center rounded-xl border border-slate-200 bg-slate-100 px-3 text-sm font-semibold text-slate-600 dark:text-slate-300 dark:border-slate-700 dark:bg-slate-800">+91</span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        value={draft.phone}
                        onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value.replace(/\D/g, "") }))}
                        placeholder="XXXXXXXXXX"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-[#1B3FAB] focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800"
                      />
                    </div>
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Hourly Rate (₹)</span>
                    <input
                      type="number"
                      min="0"
                      value={draft.hourlyRate}
                      onChange={(e) => setDraft((d) => ({ ...d, hourlyRate: e.target.value }))}
                      placeholder="850"
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-[#1B3FAB] focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Skills</span>
                    <div className="mt-2">
                      <SharedSkillPicker
                        selectedSkills={draft.skills}
                        onChange={(skills) => setDraft((d) => ({ ...d, skills }))}
                      />
                    </div>
                  </label>
                </div>
              </EditSection>

              <EditSection
                icon={Briefcase}
                title="Portfolio Projects"
                onAdd={() => addDraftListItem("projects", { title: "", link: "", description: "" })}
                addLabel="Add project"
              >
                <div className="space-y-3">
                  {draft.projects.length === 0 && <EmptySectionHint text="No projects added yet." />}
                  {draft.projects.map((entry, index) => (
                    <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                      <div className="flex items-start gap-2">
                        <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 md:grid-cols-2">
                          <input
                            value={entry.title}
                            onChange={(e) => updateDraftListItem("projects", index, { title: e.target.value })}
                            placeholder="Project title"
                            className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-[#1B3FAB] focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800"
                          />
                          <input
                            value={entry.link}
                            onChange={(e) => updateDraftListItem("projects", index, { link: e.target.value })}
                            placeholder="Link (optional)"
                            className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-[#1B3FAB] focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDraftListItem("projects", index)}
                          aria-label="Remove this project"
                          className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        value={entry.description}
                        onChange={(e) => updateDraftListItem("projects", index, { description: e.target.value })}
                        placeholder="What did you build / your role"
                        className="mt-2 w-full resize-none rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-[#1B3FAB] focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800"
                      />
                    </div>
                  ))}
                </div>
              </EditSection>

              <EditSection
                icon={GraduationCap}
                title="Education"
                onAdd={() => addDraftListItem("education", { degree: "", school: "", year: "" })}
                addLabel="Add education"
              >
                <div className="space-y-3">
                  {draft.education.length === 0 && <EmptySectionHint text="No education added yet." />}
                  {draft.education.map((entry, index) => (
                    <div key={index} className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                      <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_90px]">
                        <input
                          value={entry.degree}
                          onChange={(e) => updateDraftListItem("education", index, { degree: e.target.value })}
                          placeholder="Degree (e.g. B.Tech CSE)"
                          className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-[#1B3FAB] focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800"
                        />
                        <input
                          value={entry.school}
                          onChange={(e) => updateDraftListItem("education", index, { school: e.target.value })}
                          placeholder="School / University"
                          className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-[#1B3FAB] focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800"
                        />
                        <input
                          value={entry.year}
                          onChange={(e) => updateDraftListItem("education", index, { year: e.target.value })}
                          placeholder="Year"
                          className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-[#1B3FAB] focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDraftListItem("education", index)}
                        aria-label="Remove this education entry"
                        className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </EditSection>

              <EditSection
                icon={Award}
                title="Courses & Certifications"
                onAdd={() => addDraftListItem("certifications", { name: "", issuer: "", year: "" })}
                addLabel="Add certification"
              >
                <div className="space-y-3">
                  {draft.certifications.length === 0 && <EmptySectionHint text="No certifications added yet." />}
                  {draft.certifications.map((entry, index) => (
                    <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                      <div className="flex items-start gap-2">
                        <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_90px]">
                          <input
                            value={entry.name}
                            onChange={(e) => updateDraftListItem("certifications", index, { name: e.target.value })}
                            placeholder="Course / certification name"
                            className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-[#1B3FAB] focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800"
                          />
                          <input
                            value={entry.issuer}
                            onChange={(e) => updateDraftListItem("certifications", index, { issuer: e.target.value })}
                            placeholder="Issued by (e.g. Coursera)"
                            className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-[#1B3FAB] focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800"
                          />
                          <input
                            value={entry.year}
                            onChange={(e) => updateDraftListItem("certifications", index, { year: e.target.value })}
                            placeholder="Year"
                            className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-[#1B3FAB] focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDraftListItem("certifications", index)}
                          aria-label="Remove this certification"
                          className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="mt-2.5 flex items-center gap-2.5">
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          id={`cert-upload-${index}`}
                          onChange={(e) => handleCertificateFileChange(index, e)}
                        />
                        <label
                          htmlFor={`cert-upload-${index}`}
                          className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-500 transition hover:border-[#1B3FAB] hover:text-[#1B3FAB] dark:border-slate-600 dark:text-slate-400 dark:hover:border-blue-400 dark:hover:text-blue-400"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          {entry.fileUrl ? "Replace certificate" : "Upload certificate"}
                        </label>
                        {entry.fileUrl && (
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            <FileCheck2 className="h-3.5 w-3.5" />
                            {entry.fileName || "Attached"}
                            <button
                              type="button"
                              onClick={() => updateDraftListItem("certifications", index, { fileUrl: "", fileName: "" })}
                              aria-label="Remove attached certificate file"
                              className="text-slate-400 hover:text-rose-500"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        )}
                        {certFileError[index] && (
                          <span className="text-xs font-semibold text-red-500 dark:text-red-400">{certFileError[index]}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </EditSection>

              <EditSection icon={Pencil} title="About Me" last>
                <textarea
                  rows={4}
                  value={draft.bio}
                  onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-[#1B3FAB] focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800"
                />
              </EditSection>
            </div>
            <div className="flex flex-shrink-0 justify-end gap-2 border-t border-slate-100 dark:border-slate-800 px-6 py-4">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1B3FAB] px-4 py-2.5 text-sm font-semibold text-white transition active:scale-[0.98] hover:bg-[#15338d] disabled:opacity-60 dark:bg-gradient-to-r dark:from-[#16327A] dark:to-[#2b52d6] dark:hover:from-[#1B3FAB] dark:hover:to-[#3a63e0]"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {avatarPreviewOpen && currentUser?.avatar_url && (
        <ImageLightbox
          src={currentUser.avatar_url}
          alt={`${currentUser.name} profile`}
          onClose={() => setAvatarPreviewOpen(false)}
        />
      )}

      {avatarCropFile && (
        <AvatarCropModal
          file={avatarCropFile}
          saving={avatarUploading}
          onCancel={() => setAvatarCropFile(null)}
          onConfirm={handleCropConfirm}
        />
      )}
    </div>
  );
}
