// Business Team Access (BusinessPayments.jsx's Team tab) — the real
// Enterprise-tier "Multi-User Access for your HR team" perk. Only the
// business owner (never a team member — see currentUser.isTeamMember) can
// add/remove; the backend enforces both, this is just the API bridge.
import { apiFetch } from "./apiClient";

export function listTeam() {
  return apiFetch("/api/business/team");
}

export function addTeamMember({ name, email, password, phone }) {
  return apiFetch("/api/business/team", {
    method: "POST",
    body: { name, email, password, phone },
  });
}

export function removeTeamMember(id) {
  return apiFetch(`/api/business/team/${id}`, { method: "DELETE" });
}
