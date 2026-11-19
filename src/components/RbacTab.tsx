"use client";

import React, { useEffect, useState } from "react";
import { Check, Plus, Shield, ShieldCheck, Users } from "lucide-react";
import {
  AuthUser,
  CATEGORY_LABELS,
  PROFILE_TYPE_LABELS,
  PermissionItem,
} from "@/types/ehospia";

interface RbacRole {
  id: string;
  code: string;
  name: string;
  description: string;
  profileType: string;
  userCount: number;
  permissionIds: string[];
  permissionCodes: string[];
}

interface RbacUser {
  id: string;
  fullName: string;
  email: string;
  profileType: string;
  avatarColor: string;
  roleIds: string[];
  roles: Array<{ id: string; code: string; name: string }>;
  effectivePermissions: string[];
}

interface RbacTabProps {
  currentUser: AuthUser;
  onToast: (msg: string, type?: "success" | "error") => void;
  onRefreshBootstrap: () => void;
}

export default function RbacTab({
  currentUser,
  onToast,
  onRefreshBootstrap,
}: RbacTabProps) {
  const [roles, setRoles] = useState<RbacRole[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [users, setUsers] = useState<RbacUser[]>([]);
  const [subView, setSubView] = useState<"matrix" | "users">("matrix");
  const [showNewRoleModal, setShowNewRoleModal] = useState(false);

  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [newRoleType, setNewRoleType] = useState("DOCTOR");
  const [newRolePerms, setNewRolePerms] = useState<string[]>([]);

  const canManageRbac = currentUser.effectivePermissions.includes("rbac.manage");

  const loadRbac = async () => {
    const res = await fetch("/api/rbac", {
      headers: { "x-user-id": currentUser.id },
    });
    if (res.ok) {
      const data = await res.json();
      setRoles(data.roles || []);
      setPermissions(data.permissions || []);
      setUsers(data.users || []);
    }
  };

  useEffect(() => {
    loadRbac();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.id]);

  const handleToggleRolePerm = async (roleId: string, permissionId: string) => {
    if (!canManageRbac) {
      onToast("Permission rbac.manage requise", "error");
      return;
    }
    const res = await fetch("/api/rbac", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": currentUser.id,
      },
      body: JSON.stringify({
        action: "toggle_role_permission",
        roleId,
        permissionId,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      onToast(data.error || "Erreur RBAC", "error");
      return;
    }
    await loadRbac();
    onRefreshBootstrap();
  };

  const handleToggleUserRole = async (userId: string, roleId: string) => {
    if (!canManageRbac) {
      onToast("Permission rbac.manage requise", "error");
      return;
    }
    const res = await fetch("/api/rbac", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": currentUser.id,
      },
      body: JSON.stringify({
        action: "toggle_user_role",
        userId,
        roleId,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      onToast(data.error || "Erreur attribution rôle", "error");
      return;
    }
    onToast("Rôles de l'utilisateur mis à jour", "success");
    await loadRbac();
    onRefreshBootstrap();
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/rbac", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": currentUser.id,
      },
      body: JSON.stringify({
        name: newRoleName,
        description: newRoleDesc,
        profileType: newRoleType,
        permissionIds: newRolePerms,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      onToast(data.error || "Erreur création rôle", "error");
      return;
    }
    onToast(`Rôle "${newRoleName}" créé avec succès`, "success");
    setShowNewRoleModal(false);
    setNewRoleName("");
    setNewRoleDesc("");
    setNewRolePerms([]);
    await loadRbac();
  };

  // Group permissions by category
  const groupedPermissions = permissions.reduce<Record<string, PermissionItem[]>>(
    (acc, p) => {
      if (!acc[p.category]) acc[p.category] = [];
      acc[p.category].push(p);
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex gap-2">
          <button
            onClick={() => setSubView("matrix")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              subView === "matrix"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            Matrice Rôles ↔ Permissions ({roles.length} rôles)
          </button>
          <button
            onClick={() => setSubView("users")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              subView === "users"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Users className="h-4 w-4" />
            Attribution Multi-Rôles par Utilisateur ({users.length})
          </button>
        </div>

        {canManageRbac && (
          <button
            onClick={() => setShowNewRoleModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
          >
            <Plus className="h-4 w-4" />
            Créer un rôle personnalisé
          </button>
        )}
      </div>

      {subView === "matrix" ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-4">
            <h3 className="text-sm font-bold text-slate-900">
              Matrice Dynamique des Permissions par Rôle
            </h3>
            <p className="text-xs text-slate-500">
              Activez ou désactivez n&apos;importe quelle permission sur un rôle : tous les utilisateurs possédant ce rôle verront leurs accès mis à jour immédiatement.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="min-w-[260px] px-5 py-3 font-bold text-slate-700">
                    Permission & Catégorie
                  </th>
                  {roles.map((r) => (
                    <th
                      key={r.id}
                      className="min-w-[130px] px-3 py-3 text-center"
                    >
                      <span className="block font-bold text-slate-900">
                        {r.name}
                      </span>
                      <span className="block font-mono text-[10px] font-normal text-slate-500">
                        {r.permissionIds.length}/{permissions.length} perm.
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.entries(groupedPermissions).map(([category, perms]) => (
                  <React.Fragment key={category}>
                    <tr className="bg-slate-100/80">
                      <td
                        colSpan={roles.length + 1}
                        className="px-5 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-600"
                      >
                        {CATEGORY_LABELS[category] || category}
                      </td>
                    </tr>
                    {perms.map((perm) => (
                      <tr key={perm.id} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3">
                          <p className="font-semibold text-slate-900">
                            {perm.name}
                          </p>
                          <p className="font-mono text-[10px] text-sky-700">
                            {perm.code}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {perm.description}
                          </p>
                        </td>
                        {roles.map((role) => {
                          const enabled = role.permissionIds.includes(perm.id);
                          return (
                            <td key={role.id} className="px-3 py-3 text-center">
                              <button
                                onClick={() =>
                                  handleToggleRolePerm(role.id, perm.id)
                                }
                                disabled={!canManageRbac}
                                className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border transition ${
                                  enabled
                                    ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                                    : "border-slate-300 bg-white text-transparent hover:border-slate-400"
                                } disabled:cursor-not-allowed disabled:opacity-60`}
                              >
                                <Check className="h-4 w-4" />
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* User Multi-Role Assignment */
        <div className="space-y-3">
          {users.map((u) => (
            <div
              key={u.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold text-white"
                    style={{ backgroundColor: u.avatarColor }}
                  >
                    {u.fullName
                      .replace("Dr. ", "")
                      .replace("Inf. ", "")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">
                        {u.fullName}
                      </h4>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        {PROFILE_TYPE_LABELS[u.profileType] || u.profileType}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {u.email} •{" "}
                      <strong className="text-sky-700">
                        {u.effectivePermissions.length} permissions effectives
                      </strong>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {roles.map((r) => {
                    const assigned = u.roleIds.includes(r.id);
                    return (
                      <button
                        key={r.id}
                        onClick={() => handleToggleUserRole(u.id, r.id)}
                        disabled={!canManageRbac}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                          assigned
                            ? "border-sky-600 bg-sky-600 text-white shadow-sm"
                            : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                        } disabled:cursor-not-allowed`}
                      >
                        <Shield className="h-3.5 w-3.5" />
                        {r.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNewRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">
              Créer un nouveau rôle hospitalier
            </h3>
            <form onSubmit={handleCreateRole} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Nom du rôle *
                </label>
                <input
                  required
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="Ex: Interne de Garde / Coordinateur Parcours"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Type de profil associé
                  </label>
                  <select
                    value={newRoleType}
                    onChange={(e) => setNewRoleType(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  >
                    <option value="DOCTOR">Médecin</option>
                    <option value="NURSE">Infirmier(e)</option>
                    <option value="ADMIN">Administration</option>
                    <option value="FINANCIAL">Financier</option>
                    <option value="PATIENT">Patient</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Description
                  </label>
                  <input
                    value={newRoleDesc}
                    onChange={(e) => setNewRoleDesc(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Permissions attribuées ({newRolePerms.length})
                </label>
                <div className="mt-2 grid max-h-48 grid-cols-1 gap-1.5 overflow-y-auto rounded-xl border border-slate-200 p-3">
                  {permissions.map((p) => {
                    const checked = newRolePerms.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className="flex cursor-pointer items-center gap-2 text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setNewRolePerms((prev) =>
                              checked
                                ? prev.filter((id) => id !== p.id)
                                : [...prev, p.id]
                            )
                          }
                        />
                        <span className="font-medium text-slate-800">
                          {p.name}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          ({p.code})
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewRoleModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
                >
                  Créer le rôle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
