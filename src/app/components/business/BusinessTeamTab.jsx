import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, Loader2, Lock, Plus, Trash2, Users, X } from "lucide-react";
import { listTeam, addTeamMember, removeTeamMember } from "../../lib/businessTeamApi";
import { getSubscriptionStatus } from "../../lib/paymentsApi";
import { ApiError } from "../../lib/apiClient";
import { useAuth } from "../../context/AuthContext";

// Real Enterprise-tier "Multi-User Access for your HR team" perk. Every
// team member gets full access, same as the owner (jobs, candidates,
// chats, everything) — see auth.controller.js's issueToken for how that's
// actually wired. The only asymmetry, per how this was scoped: only the
// real owner (currentUser.isTeamMember is falsy) can add or remove anyone
// — a team member can see the roster but has no add/remove controls at
// all, not even for other team members.
export default function BusinessTeamTab() {
  const { currentUser } = useAuth();
  const isOwner = !currentUser?.isTeamMember;

  const [tier, setTier] = useState(null);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [removingId, setRemovingId] = useState(null);
  const [actionError, setActionError] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState("");

  useEffect(() => {
    Promise.all([getSubscriptionStatus(), listTeam()])
      .then(([status, members]) => {
        setTier(status.tier);
        setTeam(members);
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Could not load your team."))
      .finally(() => setLoading(false));
  }, []);

  const enterpriseActive = tier === "ENTERPRISE";

  const handleRemove = async (member) => {
    setRemovingId(member.id);
    setActionError("");
    try {
      const updated = await removeTeamMember(member.id);
      setTeam((current) => current.map((m) => (m.id === member.id ? { ...m, ...updated } : m)));
      toast.success(`${member.name} removed from the team.`);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not remove this team member.");
    } finally {
      setRemovingId(null);
    }
  };

  const handleAddMember = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setAddBusy(true);
    setAddError("");
    try {
      const created = await addTeamMember({
        name: formData.get("fullName"),
        email: formData.get("email"),
        password: formData.get("password"),
        phone: formData.get("phone") || undefined,
      });
      setTeam((current) => [created, ...current]);
      setIsAddModalOpen(false);
      toast.success(`${created.name} added to your team.`);
    } catch (err) {
      setAddError(err instanceof ApiError ? err.message : "Could not add this team member.");
    } finally {
      setAddBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-14">
        <Loader2 className="h-6 w-6 animate-spin text-slate-300 dark:text-slate-600" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <span>{loadError}</span>
      </div>
    );
  }

  if (!enterpriseActive) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-800/40">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <Lock className="h-5 w-5" />
        </span>
        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Multi-User Access is an Enterprise plan perk</p>
        <p className="max-w-sm text-xs text-slate-500 dark:text-slate-400">
          Upgrade to Enterprise on the Subscription Plans tab to give your HR team their own logins with full access to jobs, candidates, and chats.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-[#0A1128] dark:text-white">Team Access</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {isOwner
              ? "Give your HR team their own logins — full access, same as you. Only you can add or remove team members."
              : "Everyone with a login on this business account. Only the owner can add or remove team members."}
          </p>
        </div>
        {isOwner && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-[#0F172A] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-black dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            <Plus className="h-4 w-4" />
            Add Member
          </button>
        )}
      </div>

      {actionError && (
        <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {team.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-14 text-center dark:border-slate-800 dark:bg-slate-900">
          <Users className="h-8 w-8 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-400 dark:text-slate-500">
            {isOwner ? "No team members yet — add your first one above." : "No other team members yet."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {team.map((member) => {
              const initials = member.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
              return (
                <div key={member.id} className={`flex items-center gap-3 px-5 py-3.5 ${!member.is_active ? "opacity-50" : ""}`}>
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[#0A1128] dark:text-white">{member.name}</p>
                    <p className="truncate text-xs text-slate-400 dark:text-slate-500">{member.email}</p>
                  </div>
                  <span className={`flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-bold ${member.is_active ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`}>
                    <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${member.is_active ? "bg-emerald-500" : "bg-slate-400"}`} />
                    {member.is_active ? "Active" : "Removed"}
                  </span>
                  {isOwner && member.is_active && (
                    <button
                      onClick={() => handleRemove(member)}
                      disabled={removingId === member.id}
                      className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/40 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-red-500/10"
                    >
                      {removingId === member.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      Remove
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleAddMember}
            className="w-full max-w-md overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-950 dark:text-white">Add New Team Member</h2>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4 p-6">
              {addError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  <span>{addError}</span>
                </div>
              )}
              <label className="flex flex-col gap-1.5 text-sm font-bold text-slate-700 dark:text-slate-300">
                Full Name
                <input
                  name="fullName"
                  required
                  disabled={addBusy}
                  className="rounded-lg border border-slate-300 p-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-400 dark:focus:ring-slate-400"
                  placeholder="Enter full name"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-bold text-slate-700 dark:text-slate-300">
                Email Address
                <input
                  name="email"
                  type="email"
                  required
                  disabled={addBusy}
                  className="rounded-lg border border-slate-300 p-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-400 dark:focus:ring-slate-400"
                  placeholder="name@company.com"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-bold text-slate-700 dark:text-slate-300">
                Phone (optional)
                <input
                  name="phone"
                  type="tel"
                  disabled={addBusy}
                  className="rounded-lg border border-slate-300 p-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-400 dark:focus:ring-slate-400"
                  placeholder="10-digit mobile number"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-bold text-slate-700 dark:text-slate-300">
                Temporary Password
                <input
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  disabled={addBusy}
                  className="rounded-lg border border-slate-300 p-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-400 dark:focus:ring-slate-400"
                  placeholder="Minimum 8 characters"
                />
                <span className="font-normal text-xs text-slate-400 dark:text-slate-500">Share this with them directly — they can change it after signing in.</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/30">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                disabled={addBusy}
                className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-60 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addBusy}
                className="flex items-center gap-2 rounded-lg bg-[#0F172A] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                {addBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Add Member
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
