import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, Loader2, Plus, Settings2, ShieldAlert, ShieldCheck, Trash2, X } from "lucide-react";
import { listTeam, addTeamMember, removeTeamMember, updateAdminPermissions } from "../../lib/adminApi";
import { ApiError } from "../../lib/apiClient";

// A "Super Admin" is just the real full-permission state — can_ban_users
// AND can_release_funds both true, the default for every new admin. No
// separate role value exists in the DB; this UI mirrors that instead of
// pretending there's a richer role system (Tier 1 Support / Dispute
// Specialist) than the two real flags updateAdminPermissions actually
// controls — the previous version of this screen promised 7 granular
// toggles when only 2 were ever real.
function isSuperAdmin(member) {
  return Boolean(member.can_ban_users && member.can_release_funds);
}

function ToggleSwitch({ checked, onChange, disabled }) {
  return (
    <div
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onChange}
      onKeyDown={(event) => {
        if (disabled || (event.key !== "Enter" && event.key !== " ")) return;
        event.preventDefault();
        onChange();
      }}
      className={`flex h-6 w-12 items-center rounded-full p-1 transition-colors duration-300 ease-in-out ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      } ${checked ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"}`}
    >
      <div
        className={`h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300 ease-in-out ${
          checked ? "translate-x-6" : "translate-x-0"
        }`}
      />
    </div>
  );
}

function PermissionsModal({ member, busy, error, onClose, onToggle }) {
  if (!member) return null;
  const isSuper = isSuperAdmin(member);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-extrabold text-[#0A1128] dark:text-white">Permissions</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              For <span className="font-semibold text-slate-700 dark:text-slate-300">{member.name}</span>
            </p>
            {isSuper && (
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-400">
                <ShieldAlert className="h-3.5 w-3.5" />
                Super Admin — full access
              </span>
            )}
          </div>
          <button onClick={onClose} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-6">
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3.5 dark:border-slate-700">
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Ban Users</p>
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">Security Monitor's ban/warn actions</p>
            </div>
            {busy === "canBanUsers" ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            ) : (
              <ToggleSwitch checked={member.can_ban_users} onChange={() => onToggle(member, "canBanUsers")} />
            )}
          </div>
          <div className="flex items-center justify-between rounded-xl border border-red-200 px-4 py-3.5 dark:border-red-900/40">
            <div>
              <p className="text-sm font-bold text-red-700 dark:text-red-400">Force Release Escrow</p>
              <p className="mt-0.5 text-xs text-red-500/80 dark:text-red-400/70">Refund/release real held funds — high risk</p>
            </div>
            {busy === "canReleaseFunds" ? (
              <Loader2 className="h-4 w-4 animate-spin text-red-400" />
            ) : (
              <ToggleSwitch checked={member.can_release_funds} onChange={() => onToggle(member, "canReleaseFunds")} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminTeamTab() {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [managingMemberId, setManagingMemberId] = useState(null);
  const [permissionBusy, setPermissionBusy] = useState(null);
  const [permissionError, setPermissionError] = useState("");
  const [removingId, setRemovingId] = useState(null);
  const [actionError, setActionError] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState("");

  const load = () => {
    listTeam()
      .then(setTeam)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Could not load the admin team."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const managingMember = team.find((m) => m.id === managingMemberId) ?? null;

  const handleTogglePermission = async (member, key) => {
    setPermissionBusy(key);
    setPermissionError("");
    try {
      const updated = await updateAdminPermissions(member.id, { [key]: !member[key === "canBanUsers" ? "can_ban_users" : "can_release_funds"] });
      setTeam((current) => current.map((m) => (m.id === member.id ? { ...m, ...updated } : m)));
    } catch (err) {
      setPermissionError(err instanceof ApiError ? err.message : "Could not update this permission.");
    } finally {
      setPermissionBusy(null);
    }
  };

  const handleRemove = async (member) => {
    setRemovingId(member.id);
    setActionError("");
    try {
      const updated = await removeTeamMember(member.id);
      setTeam((current) => current.map((m) => (m.id === member.id ? { ...m, ...updated } : m)));
      toast.success(`${member.name} removed from the admin team.`);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not remove this team member.");
    } finally {
      setRemovingId(null);
    }
  };

  const handleAddMember = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const role = formData.get("role");
    setAddBusy(true);
    setAddError("");
    try {
      const created = await addTeamMember({
        name: formData.get("fullName"),
        email: formData.get("email"),
        password: formData.get("password"),
        canBanUsers: true,
        canReleaseFunds: role === "Super Admin",
      });
      setTeam((current) => [created, ...current]);
      setIsAddModalOpen(false);
      toast.success(`${created.name} added to the admin team.`);
    } catch (err) {
      setAddError(err instanceof ApiError ? err.message : "Could not add this team member.");
    } finally {
      setAddBusy(false);
    }
  };

  return (
    <div className="p-7">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold text-[#0A1128] dark:text-white">Team Access</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Real admin accounts. Only a Super Admin can add or remove team members — and can't remove another Super Admin.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-black dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          <Plus className="h-4 w-4" />
          Add Member
        </button>
      </div>

      {actionError && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#FF6B35] dark:border-slate-700" />
        </div>
      ) : loadError ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{loadError}</span>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Member</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Access</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {team.map((member) => {
                  const initials = member.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
                  const isSuper = isSuperAdmin(member);
                  return (
                    <tr key={member.id} className={`transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40 ${!member.is_active ? "opacity-50" : ""}`}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white">{initials}</div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-[#0A1128] dark:text-white">{member.name}</p>
                            <p className="truncate text-xs text-slate-400 dark:text-slate-500">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold ${isSuper ? "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>
                          {isSuper && <ShieldCheck className="h-3 w-3" />}
                          {isSuper ? "Super Admin" : "Limited Admin"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${member.is_active ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`}>
                          <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${member.is_active ? "bg-emerald-500" : "bg-slate-400"}`} />
                          {member.is_active ? "Active" : "Removed"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => { setManagingMemberId(member.id); setPermissionError(""); }}
                            disabled={!member.is_active}
                            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                          >
                            <Settings2 className="h-3.5 w-3.5" />
                            Manage
                          </button>
                          {member.is_active && !isSuper && (
                            <button
                              onClick={() => handleRemove(member)}
                              disabled={removingId === member.id}
                              className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/40 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-red-500/10"
                            >
                              {removingId === member.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                              Remove
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <PermissionsModal
        member={managingMember}
        busy={permissionBusy}
        error={permissionError}
        onClose={() => setManagingMemberId(null)}
        onToggle={handleTogglePermission}
      />

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <form onSubmit={handleAddMember} className="w-full max-w-md overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-950 dark:text-white">Add New Team Member</h2>
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300" aria-label="Close">
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
                <input name="fullName" required disabled={addBusy} className="rounded-lg border border-slate-300 p-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-400 dark:focus:ring-slate-400" placeholder="Enter full name" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-bold text-slate-700 dark:text-slate-300">
                Email Address
                <input name="email" type="email" required disabled={addBusy} className="rounded-lg border border-slate-300 p-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-400 dark:focus:ring-slate-400" placeholder="name@company.com" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-bold text-slate-700 dark:text-slate-300">
                Temporary Password
                <input name="password" type="password" required minLength={8} disabled={addBusy} className="rounded-lg border border-slate-300 p-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-400 dark:focus:ring-slate-400" placeholder="Minimum 8 characters" />
                <span className="font-normal text-xs text-slate-400 dark:text-slate-500">Share this with them directly — they can change it after signing in.</span>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-bold text-slate-700 dark:text-slate-300">
                Access Level
                <select name="role" required defaultValue="Limited Admin" className="rounded-lg border border-slate-300 bg-white p-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-400 dark:focus:ring-slate-400">
                  <option>Limited Admin</option>
                  <option>Super Admin</option>
                </select>
                <span className="font-normal text-xs text-slate-400 dark:text-slate-500">Limited Admin can ban users but not touch escrow funds — fine-tune later via Manage.</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/30">
              <button type="button" onClick={() => setIsAddModalOpen(false)} disabled={addBusy} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-60 dark:text-slate-300 dark:hover:bg-slate-700">
                Cancel
              </button>
              <button type="submit" disabled={addBusy} className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
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
