import { useState } from "react";
import { toast } from "sonner";
import { Info, Plus, Settings2, ShieldAlert, Lock, ShieldX, Trash2, X } from "lucide-react";
import { INITIAL_TEAM } from "../../data/mockAdminData";

const ROLE_BADGE = {
  "Super Admin": "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  "Tier 1 Support": "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  "Dispute Specialist": "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400",
};

function ToggleSwitch({ checked, onChange, disabled, dimmed }) {
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
      className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ease-in-out ${
        disabled ? "cursor-not-allowed" : "cursor-pointer"
      } ${dimmed ? "opacity-60 grayscale" : ""} ${checked ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"}`}
    >
      <div
        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${
          checked ? "translate-x-6" : "translate-x-0"
        }`}
      />
    </div>
  );
}

// The Access Control Matrix — unchanged real logic from before this
// redesign, just moved from a permanent second column into a modal opened
// per-row via the table's "Manage" action, so the table itself can stay a
// clean 4-column RBAC list without losing this detail.
function PermissionsModal({ member, onClose, onTogglePermission }) {
  if (!member) return null;
  const isSuper = member.role === "Super Admin";
  const isSupport = member.role === "Tier 1 Support" || member.name.toLowerCase().includes("support");

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="wb-scroll-clean max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/70 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-extrabold text-[#0A1128] dark:text-white font-display">
              Access Control Matrix
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Permissions for <span className="font-semibold text-slate-700 dark:text-slate-300">{member.name}</span>
              {" — "}
              <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold ${ROLE_BADGE[member.role] ?? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>
                {member.role}
              </span>
            </p>
            {isSuper && (
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-400">
                <ShieldAlert className="h-3.5 w-3.5" />
                Super Admins have full access — none of these permissions can be turned off for this role.
              </span>
            )}
          </div>
          <button onClick={onClose} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
            <h3 className="mb-1 text-sm font-bold text-slate-900 dark:text-white">Content Moderation</h3>
            {[
              { key: "viewChats", label: "View Chats" },
              { key: "redactMessages", label: "Redact Messages" },
              { key: "sendWarnings", label: "Send Warnings" },
            ].map(({ key, label }) => {
              const checked = isSuper ? true : member.permissions[key];
              return (
                <div key={key} className="flex items-center justify-between border-b border-slate-100 py-3 last:border-0 dark:border-slate-800">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}</span>
                  <ToggleSwitch checked={checked} disabled={isSuper} onChange={() => onTogglePermission(member.id, key)} />
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-red-200 p-5 dark:border-red-900/40">
            <div className="mb-1 flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-red-600 dark:text-red-400">Financial Escrow</h3>
              <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:border-red-900/40 dark:bg-red-500/10 dark:text-red-400">HIGH RISK</span>
            </div>
            <div className={isSupport ? "rounded-xl bg-slate-50/80 dark:bg-slate-800/50" : "rounded-xl"}>
              {[
                { key: "refundEscrow", label: "Refund Escrow" },
                { key: "forceRelease", label: "Force Release Escrow" },
              ].map(({ key, label }) => {
                const checked = isSuper ? true : member.permissions[key];
                return (
                  <div key={key} className={`flex items-center justify-between border-b border-slate-100 px-3 py-3 last:border-0 dark:border-slate-800 ${isSupport ? "opacity-60 grayscale" : ""}`}>
                    <span className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">{label}</span>
                    {isSupport ? (
                      <Lock size={20} className="text-slate-400 dark:text-slate-500" />
                    ) : (
                      <ToggleSwitch checked={checked} disabled={isSuper} dimmed={!isSuper} onChange={() => onTogglePermission(member.id, key)} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
            <h3 className="mb-1 text-sm font-bold text-slate-900 dark:text-white">User Management</h3>
            {[
              { key: "approveKyc", label: "Approve KYC" },
              { key: "banUsers", label: "Ban Users" },
            ].map(({ key, label }) => {
              const checked = isSuper ? true : member.permissions[key];
              return (
                <div key={key} className="flex items-center justify-between border-b border-slate-100 py-3 last:border-0 dark:border-slate-800">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}</span>
                  <ToggleSwitch checked={checked} disabled={isSuper} onChange={() => onTogglePermission(member.id, key)} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminTeamTab() {
  const [team, setTeam] = useState(INITIAL_TEAM);
  const [managingMemberId, setManagingMemberId] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const managingMember = team.find((m) => m.id === managingMemberId) ?? null;

  const togglePermission = (memberId, key) => {
    setTeam((current) =>
      current.map((member) =>
        member.id === memberId
          ? { ...member, permissions: { ...member.permissions, [key]: !member.permissions[key] } }
          : member
      )
    );
  };

  const revokeAccess = (member) => {
    setTeam((current) => current.filter((m) => m.id !== member.id));
    toast.success(`${member.name} removed from the roster — local change only, not yet persisted.`);
  };

  const handleAddMember = (event) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const role = formData.get("role");
    const name = formData.get("fullName");
    const newMember = {
      id: Date.now(),
      name,
      role,
      status: "Active",
      permissions: {
        viewChats: true,
        redactMessages: role === "Super Admin" || role === "Dispute Specialist",
        sendWarnings: true,
        refundEscrow: role === "Super Admin",
        forceRelease: role === "Super Admin",
        approveKyc: role === "Super Admin" || role === "Dispute Specialist",
        banUsers: role === "Super Admin",
      },
    };

    setTeam((current) => [...current, newMember]);
    setIsAddModalOpen(false);
    toast.success(`${name} added as ${role} — local change only, not yet persisted.`);
  };

  return (
    <div className="p-7">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-[#0A1128] dark:text-white font-display">
            Team Access
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Role-based permissions. Only Super Admins can touch escrow.</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-black dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          <Plus className="h-4 w-4" />
          Add Member
        </button>
      </div>

      <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-400">
        <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        <span>Changes here are local to this session — team management isn't wired to a backend yet, so a refresh resets the roster to its starting state.</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Member</th>
                <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Role</th>
                <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</th>
                <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {team.map((member) => {
                const initials = member.name
                  .split(" ")
                  .map((word) => word[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                const isSuper = member.role === "Super Admin";

                return (
                  <tr key={member.id} className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white">
                          {initials}
                        </div>
                        <p className="truncate text-sm font-bold text-[#0A1128] dark:text-white">{member.name}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block rounded-md px-2.5 py-1 text-xs font-bold ${ROLE_BADGE[member.role] ?? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>
                        {member.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                        {member.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setManagingMemberId(member.id)}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                          <Settings2 className="h-3.5 w-3.5" />
                          Manage
                        </button>
                        {!isSuper && (
                          <button
                            onClick={() => revokeAccess(member)}
                            className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/40 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-red-500/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

      <PermissionsModal
        member={managingMember}
        onClose={() => setManagingMemberId(null)}
        onTogglePermission={togglePermission}
      />

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <form onSubmit={handleAddMember} className="w-full max-w-md overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-950 dark:text-white">Add New Team Member</h2>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                aria-label="Close add member modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4 p-6">
              <label className="flex flex-col gap-1.5 text-sm font-bold text-slate-700 dark:text-slate-300">
                Full Name
                <input
                  name="fullName"
                  required
                  className="rounded-lg border border-slate-300 p-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-400 dark:focus:ring-slate-400"
                  placeholder="Enter full name"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-bold text-slate-700 dark:text-slate-300">
                Email Address
                <input
                  name="email"
                  type="email"
                  required
                  className="rounded-lg border border-slate-300 p-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-400 dark:focus:ring-slate-400"
                  placeholder="name@company.com"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-bold text-slate-700 dark:text-slate-300">
                Role
                <select
                  name="role"
                  required
                  defaultValue="Tier 1 Support"
                  className="rounded-lg border border-slate-300 bg-white p-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-400 dark:focus:ring-slate-400"
                >
                  <option>Tier 1 Support</option>
                  <option>Dispute Specialist</option>
                  <option>Super Admin</option>
                </select>
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/30">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-black dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
                Add Member
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
