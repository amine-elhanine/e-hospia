"use client";

import React, { useEffect, useState } from "react";
import {
  BadgeCheck,
  Briefcase,
  FolderHeart,
  Landmark,
  Plus,
  Stethoscope,
  UserCheck,
  Users,
} from "lucide-react";
import {
  AuthUser,
  DepartmentSummary,
  PROFILE_TYPE_BADGES,
  PROFILE_TYPE_LABELS,
  RoleSummary,
  formatCurrency,
} from "@/types/ehospia";

interface DirectoryProfile {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  avatarColor: string;
  profileType: string;
  isActive: boolean;
  roles: RoleSummary[];
  doctorProfile?: {
    id: string;
    rppsNumber: string;
    specialty: string;
    grade: string;
    availability: string;
    bio: string;
    department: DepartmentSummary;
    _count?: { leadCases: number; assignedCases: number };
  } | null;
  nurseProfile?: {
    id: string;
    matricule: string;
    shift: string;
    qualification: string;
    department: DepartmentSummary;
  } | null;
  adminProfile?: {
    id: string;
    matricule: string;
    position: string;
    office: string;
    scope: string;
  } | null;
  financialProfile?: {
    id: string;
    matricule: string;
    title: string;
    billingUnit: string;
    authorizationLimit: number;
  } | null;
  patientProfile?: {
    id: string;
    folderNumber: string;
    birthDate: string;
    bloodType: string;
    insuranceProvider: string;
    _count?: { medicalCases: number; invoices: number };
  } | null;
}

interface ProfilesTabProps {
  currentUser: AuthUser;
  departments: DepartmentSummary[];
  onOpenPatientFolder: (patientId: string) => void;
  onToast: (msg: string, type?: "success" | "error") => void;
  onRefreshBootstrap: () => void;
}

export default function ProfilesTab({
  currentUser,
  departments,
  onOpenPatientFolder,
  onToast,
  onRefreshBootstrap,
}: ProfilesTabProps) {
  const [profiles, setProfiles] = useState<DirectoryProfile[]>([]);
  const [filter, setFilter] = useState<string>("ALL");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create form
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newType, setNewType] = useState("DOCTOR");
  const [newDeptId, setNewDeptId] = useState(departments[0]?.id || "");
  const [newDetail1, setNewDetail1] = useState("");
  const [newDetail2, setNewDetail2] = useState("");

  const canManage = currentUser.effectivePermissions.includes("profiles.manage");

  const loadProfiles = async () => {
    const res = await fetch("/api/profiles", {
      headers: { "x-user-id": currentUser.id },
    });
    if (res.ok) {
      const data = await res.json();
      setProfiles(data.profiles || []);
    }
  };

  useEffect(() => {
    loadProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.id]);

  const handleUpdateAvailability = async (
    targetUserId: string,
    availability: string
  ) => {
    const res = await fetch("/api/profiles", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": currentUser.id,
      },
      body: JSON.stringify({ targetUserId, availability }),
    });
    if (res.ok) {
      onToast("Disponibilité mise à jour", "success");
      await loadProfiles();
    } else {
      const data = await res.json();
      onToast(data.error || "Non autorisé", "error");
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/profiles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": currentUser.id,
      },
      body: JSON.stringify({
        fullName: newName,
        email: newEmail,
        password: newPassword || undefined,
        phone: newPhone,
        profileType: newType,
        departmentId: newDeptId || departments[0]?.id,
        specialty: newDetail1,
        grade: newDetail2,
        qualification: newDetail1,
        shift: newDetail2 || "MATIN",
        position: newDetail1,
        office: newDetail2,
        title: newDetail1,
        billingUnit: newDetail2,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      onToast(data.error || "Erreur de création", "error");
      return;
    }
    onToast("Profil créé et rôle par défaut attribué", "success");
    setShowCreateModal(false);
    setNewName("");
    setNewEmail("");
    setNewPassword("");
    setNewPhone("");
    setNewDetail1("");
    setNewDetail2("");
    await loadProfiles();
    onRefreshBootstrap();
  };

  const filtered =
    filter === "ALL"
      ? profiles
      : profiles.filter((p) => p.profileType === filter);

  const countByType = (t: string) =>
    profiles.filter((p) => p.profileType === t).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {[
            { id: "ALL", label: `Tous (${profiles.length})` },
            { id: "DOCTOR", label: `Médecins (${countByType("DOCTOR")})` },
            { id: "NURSE", label: `Infirmiers (${countByType("NURSE")})` },
            { id: "ADMIN", label: `Administration (${countByType("ADMIN")})` },
            { id: "FINANCIAL", label: `Finances (${countByType("FINANCIAL")})` },
            { id: "PATIENT", label: `Patients (${countByType("PATIENT")})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                filter === tab.id
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {canManage && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
          >
            <Plus className="h-4 w-4" />
            Nouveau profil hospitalier
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((p) => (
          <div
            key={p.id}
            className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                    style={{ backgroundColor: p.avatarColor }}
                  >
                    {p.fullName
                      .replace("Dr. ", "")
                      .replace("Inf. ", "")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      {p.fullName}
                    </h4>
                    <p className="text-xs text-slate-500">{p.email}</p>
                  </div>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                    PROFILE_TYPE_BADGES[p.profileType] ||
                    "bg-slate-100 text-slate-700"
                  }`}
                >
                  {PROFILE_TYPE_LABELS[p.profileType] || p.profileType}
                </span>
              </div>

              {/* Role pills */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.roles.map((r) => (
                  <span
                    key={r.id}
                    className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700"
                  >
                    <BadgeCheck className="h-3 w-3 text-sky-600" />
                    {r.name}
                  </span>
                ))}
              </div>

              {/* Specific Profile Body */}
              <div className="mt-4 rounded-xl bg-slate-50 p-3.5 text-xs text-slate-700">
                {p.doctorProfile && (
                  <div className="space-y-1.5">
                    <p className="flex items-center gap-1.5 font-bold text-slate-900">
                      <Stethoscope className="h-3.5 w-3.5 text-sky-600" />
                      {p.doctorProfile.specialty}
                    </p>
                    <p>
                      Service :{" "}
                      <strong>{p.doctorProfile.department.name}</strong> •{" "}
                      {p.doctorProfile.grade}
                    </p>
                    <p className="font-mono text-[11px] text-slate-500">
                      {p.doctorProfile.rppsNumber} •{" "}
                      {p.doctorProfile._count?.assignedCases ?? 0} cas suivis
                    </p>
                    {(canManage || p.id === currentUser.id) && (
                      <div className="pt-1">
                        <label className="text-[10px] font-bold uppercase text-slate-500">
                          Disponibilité :
                        </label>
                        <select
                          value={p.doctorProfile.availability}
                          onChange={(e) =>
                            handleUpdateAvailability(p.id, e.target.value)
                          }
                          className="ml-2 rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-semibold"
                        >
                          <option value="DISPONIBLE">DISPONIBLE</option>
                          <option value="DE_GARDE">DE_GARDE</option>
                          <option value="EN_INTERVENTION">EN_INTERVENTION</option>
                          <option value="ABSENT">ABSENT</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {p.nurseProfile && (
                  <div className="space-y-1">
                    <p className="flex items-center gap-1.5 font-bold text-slate-900">
                      <Users className="h-3.5 w-3.5 text-teal-600" />
                      {p.nurseProfile.qualification}
                    </p>
                    <p>
                      Service : <strong>{p.nurseProfile.department.name}</strong>
                    </p>
                    <p>
                      Matricule : {p.nurseProfile.matricule} • Poste :{" "}
                      <strong>{p.nurseProfile.shift}</strong>
                    </p>
                  </div>
                )}

                {p.adminProfile && (
                  <div className="space-y-1">
                    <p className="flex items-center gap-1.5 font-bold text-slate-900">
                      <Briefcase className="h-3.5 w-3.5 text-slate-700" />
                      {p.adminProfile.position}
                    </p>
                    <p>{p.adminProfile.office}</p>
                    <p className="text-[11px] text-slate-500">
                      Périmètre : {p.adminProfile.scope}
                    </p>
                  </div>
                )}

                {p.financialProfile && (
                  <div className="space-y-1">
                    <p className="flex items-center gap-1.5 font-bold text-slate-900">
                      <Landmark className="h-3.5 w-3.5 text-emerald-600" />
                      {p.financialProfile.title}
                    </p>
                    <p>{p.financialProfile.billingUnit}</p>
                    <p>
                      Plafond validation :{" "}
                      <strong>
                        {formatCurrency(p.financialProfile.authorizationLimit)}
                      </strong>
                    </p>
                  </div>
                )}

                {p.patientProfile && (
                  <div className="space-y-1">
                    <p className="flex items-center gap-1.5 font-bold text-slate-900">
                      <UserCheck className="h-3.5 w-3.5 text-rose-600" />
                      Dossier {p.patientProfile.folderNumber} • Groupe{" "}
                      {p.patientProfile.bloodType}
                    </p>
                    <p>
                      Mutuelle : {p.patientProfile.insuranceProvider} •{" "}
                      {p.patientProfile._count?.medicalCases ?? 0} cas médicaux
                    </p>
                  </div>
                )}
              </div>
            </div>

            {p.patientProfile && (
              <button
                onClick={() => onOpenPatientFolder(p.patientProfile!.id)}
                className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-100"
              >
                <FolderHeart className="h-3.5 w-3.5" />
                Voir le dossier médical
              </button>
            )}
          </div>
        ))}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                Créer un nouveau profil E-HOSPIA
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-sm font-bold text-slate-400"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateProfile} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Type de profil *
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold"
                >
                  <option value="DOCTOR">Médecin</option>
                  <option value="NURSE">Infirmier(e)</option>
                  <option value="ADMIN">Administration</option>
                  <option value="FINANCIAL">Personnel Financier</option>
                  <option value="PATIENT">Patient</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Nom complet *
                </label>
                <input
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Dr. Amine Berrada"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Email *
                  </label>
                  <input
                    required
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="nom@e-hospia.fr"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Mot de passe (défaut: Ehospia@2026)
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Téléphone
                </label>
                <input
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              </div>

              {(newType === "DOCTOR" || newType === "NURSE") && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Département d&apos;affectation
                  </label>
                  <select
                    value={newDeptId}
                    onChange={(e) => setNewDeptId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {newType !== "PATIENT" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      {newType === "DOCTOR"
                        ? "Spécialité"
                        : newType === "NURSE"
                          ? "Qualification"
                          : "Fonction / Poste"}
                    </label>
                    <input
                      value={newDetail1}
                      onChange={(e) => setNewDetail1(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      {newType === "DOCTOR"
                        ? "Grade"
                        : newType === "NURSE"
                          ? "Poste (MATIN/NUIT)"
                          : "Bureau / Unité"}
                    </label>
                    <input
                      value={newDetail2}
                      onChange={(e) => setNewDetail2(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
                >
                  Créer le profil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
