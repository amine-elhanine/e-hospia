"use client";

import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  BedDouble,
  Building2,
  FolderHeart,
  Phone,
  Save,
  Stethoscope,
  Users,
} from "lucide-react";
import {
  ALERT_LEVEL_STYLES,
  AuthUser,
  CASE_STATUS_STYLES,
  DepartmentSummary,
} from "@/types/ehospia";
import { demoFetch } from "@/lib/demoStore";

interface DepartmentDetail extends DepartmentSummary {
  doctors: Array<{
    id: string;
    rppsNumber: string;
    specialty: string;
    grade: string;
    availability: string;
    user: {
      id: string;
      fullName: string;
      email: string;
      phone?: string | null;
      avatarColor: string;
    };
  }>;
  nurses: Array<{
    id: string;
    matricule: string;
    shift: string;
    qualification: string;
    user: {
      id: string;
      fullName: string;
      email: string;
      phone?: string | null;
      avatarColor: string;
    };
  }>;
  medicalCases: Array<{
    id: string;
    caseNumber: string;
    title: string;
    status: string;
    priority: string;
    roomBed?: string | null;
    patientId: string;
    patient: {
      id: string;
      folderNumber: string;
      user: { fullName: string; avatarColor: string };
    };
    leadDoctor: {
      user: { fullName: string };
    };
    assignedDoctors: Array<{
      roleInCase: string;
      doctor: { user: { fullName: string } };
    }>;
  }>;
}

interface DepartmentsTabProps {
  currentUser: AuthUser;
  selectedDepartmentId: string | null;
  onSelectDepartment: (id: string) => void;
  onOpenPatientFolder: (patientId: string) => void;
  onToast: (msg: string, type?: "success" | "error") => void;
  onRefreshBootstrap: () => void;
}

export default function DepartmentsTab({
  currentUser,
  selectedDepartmentId,
  onSelectDepartment,
  onOpenPatientFolder,
  onToast,
  onRefreshBootstrap,
}: DepartmentsTabProps) {
  const [departments, setDepartments] = useState<DepartmentDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editAlert, setEditAlert] = useState("NORMAL");
  const [editOccupied, setEditOccupied] = useState(0);
  const [editTotal, setEditTotal] = useState(10);

  const canManage = currentUser.effectivePermissions.includes("departments.manage");
  const canViewAllFolders =
    currentUser.effectivePermissions.includes("folder.view_all");

  const loadDepartments = async () => {
    setLoading(true);
    try {
      const res = await demoFetch("/api/departments", {
        headers: { "x-user-id": currentUser.id },
      });
      const data = await res.json();
      if (res.ok && data.departments) {
        setDepartments(data.departments);
        const activeId =
          selectedDepartmentId &&
          data.departments.some((d: DepartmentDetail) => d.id === selectedDepartmentId)
            ? selectedDepartmentId
            : data.departments[0]?.id;
        if (activeId) {
          onSelectDepartment(activeId);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.id]);

  const activeDept =
    departments.find((d) => d.id === selectedDepartmentId) || departments[0];

  useEffect(() => {
    if (activeDept) {
      setEditAlert(activeDept.alertLevel);
      setEditOccupied(activeDept.occupiedBeds);
      setEditTotal(activeDept.totalBeds);
    }
  }, [activeDept?.id, activeDept?.alertLevel, activeDept?.occupiedBeds, activeDept?.totalBeds]);

  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDept) return;
    setSaving(true);
    try {
      const res = await demoFetch("/api/departments", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id,
        },
        body: JSON.stringify({
          id: activeDept.id,
          alertLevel: editAlert,
          occupiedBeds: editOccupied,
          totalBeds: editTotal,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onToast(data.error || "Erreur de mise à jour", "error");
        return;
      }
      onToast(`Service ${activeDept.name} mis à jour avec succès`, "success");
      await loadDepartments();
      onRefreshBootstrap();
    } finally {
      setSaving(false);
    }
  };

  if (loading && departments.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
        Chargement des 8 départements hospitaliers...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Horizontal 8-department selector strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
        {departments.map((dept) => {
          const isSelected = activeDept?.id === dept.id;
          const freeBeds = Math.max(0, dept.totalBeds - dept.occupiedBeds);
          return (
            <button
              key={dept.id}
              onClick={() => onSelectDepartment(dept.id)}
              className={`rounded-xl border p-3 text-left transition ${
                isSelected
                  ? "border-sky-500 bg-sky-50/70 ring-2 ring-sky-500/20 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: dept.color }}
                />
                <span className="text-[10px] font-bold text-slate-500">
                  {dept.occupiedBeds}/{dept.totalBeds}
                </span>
              </div>
              <p className="mt-1.5 truncate text-sm font-bold text-slate-900">
                {dept.name}
              </p>
              <div className="mt-1 flex items-center justify-between gap-1">
                <span
                  className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                    ALERT_LEVEL_STYLES[dept.alertLevel] || ALERT_LEVEL_STYLES.NORMAL
                  }`}
                >
                  {dept.alertLevel}
                </span>
                <span className="text-[10px] font-bold text-emerald-700">
                  {freeBeds} libres
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Department Detail */}
      {activeDept && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left: Info + Capacity Management */}
          <div className="space-y-6 lg:col-span-1">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-sm"
                    style={{ backgroundColor: activeDept.color }}
                  >
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {activeDept.name}
                    </h2>
                    <p className="text-xs font-medium text-slate-500">
                      Code : {activeDept.code} • {activeDept.floor}
                    </p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${
                    ALERT_LEVEL_STYLES[activeDept.alertLevel] ||
                    ALERT_LEVEL_STYLES.NORMAL
                  }`}
                >
                  {activeDept.alertLevel === "CRITIQUE" && (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  )}
                  {activeDept.alertLevel}
                </span>
              </div>

              <p className="mt-4 text-sm text-slate-600">
                {activeDept.description}
              </p>

              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center">
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-[10px] font-bold uppercase text-slate-400">
                    Capacité totale
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-slate-900">
                    {activeDept.totalBeds} lits
                  </p>
                </div>
                <div className="rounded-lg bg-indigo-50 p-2">
                  <p className="text-[10px] font-bold uppercase text-indigo-600">
                    Lits occupés
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-indigo-900">
                    {activeDept.occupiedBeds}
                  </p>
                </div>
                <div className="rounded-lg bg-emerald-50 p-2">
                  <p className="text-[10px] font-bold uppercase text-emerald-600">
                    Lits vides
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-emerald-800">
                    {Math.max(0, activeDept.totalBeds - activeDept.occupiedBeds)}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-4 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Phone className="h-3.5 w-3.5 text-sky-600" />
                  Poste interne : {activeDept.phoneExtension}
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <BedDouble className="h-3.5 w-3.5 text-indigo-600" />
                  Taux d&apos;occupation :{" "}
                  {activeDept.totalBeds > 0
                    ? Math.round(
                        (activeDept.occupiedBeds / activeDept.totalBeds) * 100
                      )
                    : 0}
                  %
                </span>
              </div>

              {canManage && (
                <form
                  onSubmit={handleSaveDepartment}
                  className="mt-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Pilotage du service (departments.manage)
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600">
                        Lits occupés
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={editTotal}
                        value={editOccupied}
                        onChange={(e) => setEditOccupied(Number(e.target.value))}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600">
                        Total lits
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={editTotal}
                        onChange={(e) => setEditTotal(Number(e.target.value))}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600">
                        Alerte
                      </label>
                      <select
                        value={editAlert}
                        onChange={(e) => setEditAlert(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold"
                      >
                        <option value="NORMAL">NORMAL</option>
                        <option value="TENSION">TENSION</option>
                        <option value="CRITIQUE">CRITIQUE</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {saving ? "Enregistrement..." : "Mettre à jour le service"}
                  </button>
                </form>
              )}
            </div>

            {/* Staff in Department */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Stethoscope className="h-4 w-4 text-sky-600" />
                Médecins rattachés ({activeDept.doctors.length})
              </h3>
              <div className="mt-3 space-y-2.5">
                {activeDept.doctors.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    Interventions par médecins de liaison.
                  </p>
                ) : (
                  activeDept.doctors.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: doc.user.avatarColor }}
                        >
                          {doc.user.fullName
                            .replace("Dr. ", "")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            {doc.user.fullName}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {doc.specialty} • {doc.grade}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-700 ring-1 ring-slate-200">
                        {doc.availability}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <h3 className="mt-5 flex items-center gap-2 text-sm font-bold text-slate-900">
                <Users className="h-4 w-4 text-teal-600" />
                Équipe Infirmière ({activeDept.nurses.length})
              </h3>
              <div className="mt-3 space-y-2">
                {activeDept.nurses.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    Pool infirmier transversal affecté selon roulement.
                  </p>
                ) : (
                  activeDept.nurses.map((nurse) => (
                    <div
                      key={nurse.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-2.5"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          {nurse.user.fullName}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {nurse.qualification}
                        </p>
                      </div>
                      <span className="rounded bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700">
                        Poste {nurse.shift}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right: Active Cases in this Department (or Operational Summary for Admin without folder.view_all) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            {!canViewAllFolders ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Tableau Opérationnel — {activeDept.name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Vue administrative des capacités d&apos;accueil et des effectifs du service.
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                    {activeDept._count?.medicalCases ?? 0} patient(s) hospitalisé(s)
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-medium text-slate-500">
                      Lits occupés
                    </p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">
                      {activeDept.occupiedBeds} / {activeDept.totalBeds}
                    </p>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                    <p className="text-xs font-medium text-emerald-700">
                      Lits vides disponibles
                    </p>
                    <p className="mt-1 text-2xl font-bold text-emerald-800">
                      {Math.max(0, activeDept.totalBeds - activeDept.occupiedBeds)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4">
                    <p className="text-xs font-medium text-sky-700">
                      Effectifs affectés
                    </p>
                    <p className="mt-1 text-2xl font-bold text-sky-900">
                      {activeDept.doctors.length} méd. • {activeDept.nurses.length}{" "}
                      inf.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                  <strong>Secret médical respecté :</strong> votre rôle actuel (
                  {currentUser.roleNames.join(", ")}) ne dispose pas de la permission
                  clinique <code>folder.view_all</code>. Les diagnostics et dossiers
                  médicaux nominatifs des patients restent strictement réservés aux
                  médecins et infirmiers.
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Cas médicaux pris en charge en {activeDept.name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Dossiers en cours avec leurs médecins référents et consultants.
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                    {activeDept.medicalCases.length} cas visible(s)
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {activeDept.medicalCases.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                      Aucun cas médical visible dans ce département pour votre profil.
                    </div>
                  ) : (
                    activeDept.medicalCases.map((mc) => (
                      <div
                        key={mc.id}
                        className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition hover:bg-white hover:shadow-sm"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-bold text-sky-700">
                                {mc.caseNumber}
                              </span>
                              <span
                                className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                                  CASE_STATUS_STYLES[mc.status] ||
                                  CASE_STATUS_STYLES.ACTIF
                                }`}
                              >
                                {mc.status}
                              </span>
                              {mc.roomBed && (
                                <span className="rounded bg-slate-200/80 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                  Lit : {mc.roomBed}
                                </span>
                              )}
                            </div>
                            <h4 className="text-base font-bold text-slate-900">
                              {mc.title}
                            </h4>
                            <p className="text-xs font-medium text-slate-600">
                              Patient :{" "}
                              <span className="font-bold text-slate-900">
                                {mc.patient.user.fullName}
                              </span>{" "}
                              ({mc.patient.folderNumber})
                            </p>
                          </div>

                          <button
                            onClick={() => onOpenPatientFolder(mc.patient.id)}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-700"
                          >
                            <FolderHeart className="h-3.5 w-3.5" />
                            Ouvrir le dossier
                          </button>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200/70 pt-3">
                          <span className="text-[11px] font-semibold text-slate-500">
                            Médecins impliqués :
                          </span>
                          {mc.assignedDoctors.map((ad, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200"
                            >
                              <Stethoscope className="h-3 w-3 text-sky-600" />
                              {ad.doctor.user.fullName} ({ad.roleInCase})
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
