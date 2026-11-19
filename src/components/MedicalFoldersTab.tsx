"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  ClipboardPlus,
  FileText,
  FolderHeart,
  HeartPulse,
  Plus,
  Search,
  Stethoscope,
  Trash2,
  UserPlus,
} from "lucide-react";
import {
  AuthUser,
  CASE_STATUS_STYLES,
  DepartmentSummary,
  PRIORITY_STYLES,
  formatDateTime,
} from "@/types/ehospia";
import { demoFetch } from "@/lib/demoStore";

interface DoctorRef {
  id: string;
  specialty: string;
  grade: string;
  department: DepartmentSummary;
  user: { fullName: string; email: string; avatarColor: string };
}

interface MedicalCaseFull {
  id: string;
  caseNumber: string;
  title: string;
  problemCategory: string;
  diagnosis: string;
  symptoms: string;
  treatmentPlan: string;
  status: string;
  priority: string;
  roomBed?: string | null;
  openedAt: string;
  departmentId: string;
  department: DepartmentSummary;
  leadDoctorId: string;
  leadDoctor: DoctorRef;
  assignedDoctors: Array<{
    id: string;
    doctorId: string;
    roleInCase: string;
    doctor: DoctorRef;
  }>;
  clinicalNotes: Array<{
    id: string;
    authorName: string;
    authorRole: string;
    noteType: string;
    content: string;
    prescriptionDetails?: string | null;
    createdAt: string;
  }>;
  vitalSignLogs: Array<{
    id: string;
    recordedByName: string;
    bloodPressure: string;
    heartRate: number;
    temperature: number;
    oxygenSaturation: number;
    notes?: string | null;
    recordedAt: string;
  }>;
}

interface PatientFolder {
  id: string;
  folderNumber: string;
  nationalId: string;
  birthDate: string;
  gender: string;
  bloodType: string;
  allergies: string;
  chronicConditions: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  insuranceProvider: string;
  insuranceNumber: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    phone?: string | null;
    avatarColor: string;
  };
  medicalCases: MedicalCaseFull[];
}

interface MedicalFoldersTabProps {
  currentUser: AuthUser;
  departments: DepartmentSummary[];
  initialPatientId: string | null;
  onToast: (msg: string, type?: "success" | "error") => void;
  onRefreshBootstrap: () => void;
}

export default function MedicalFoldersTab({
  currentUser,
  departments,
  initialPatientId,
  onToast,
  onRefreshBootstrap,
}: MedicalFoldersTabProps) {
  const [patients, setPatients] = useState<PatientFolder[]>([]);
  const [scope, setScope] = useState<"ALL" | "OWN" | "NONE">("ALL");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    initialPatientId
  );
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [allDoctors, setAllDoctors] = useState<DoctorRef[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals / Inline Forms
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [newCaseTitle, setNewCaseTitle] = useState("");
  const [newCaseDeptId, setNewCaseDeptId] = useState(departments[0]?.id || "");
  const [newCaseLeadDocId, setNewCaseLeadDocId] = useState("");
  const [newCaseCoDocIds, setNewCaseCoDocIds] = useState<string[]>([]);
  const [newCaseCategory, setNewCaseCategory] = useState("");
  const [newCaseSymptoms, setNewCaseSymptoms] = useState("");
  const [newCaseDiagnosis, setNewCaseDiagnosis] = useState("");
  const [newCaseTreatment, setNewCaseTreatment] = useState("");
  const [newCasePriority, setNewCasePriority] = useState("NORMALE");
  const [newCaseBed, setNewCaseBed] = useState("");

  // Assign doctor form
  const [assignDocId, setAssignDocId] = useState("");
  const [assignDocRole, setAssignDocRole] = useState("Médecin Spécialiste Consultant");

  // Note form
  const [noteType, setNoteType] = useState("OBSERVATION");
  const [noteContent, setNoteContent] = useState("");
  const [notePrescription, setNotePrescription] = useState("");

  // Vitals form
  const [vBp, setVBp] = useState("120/80");
  const [vHr, setVHr] = useState(78);
  const [vTemp, setVTemp] = useState(37.0);
  const [vSpo2, setVSpo2] = useState(98);
  const [vNotes, setVNotes] = useState("");

  // Edit case form
  const [editingCase, setEditingCase] = useState(false);
  const [editStatus, setEditStatus] = useState("ACTIF");
  const [editDiagnosis, setEditDiagnosis] = useState("");
  const [editTreatment, setEditTreatment] = useState("");

  const perms = new Set(currentUser.effectivePermissions);
  const canCreateCase = perms.has("case.create");
  const canEditCase = perms.has("case.edit");
  const canAssignDoctor = perms.has("case.assign_doctor");
  const canAddNote = perms.has("clinical_note.create");
  const canRecordVitals = perms.has("vitals.record");

  const loadData = async () => {
    setLoading(true);
    try {
      const headers = { "x-user-id": currentUser.id };
      const [patRes, profRes] = await Promise.all([
        demoFetch("/api/patients", { headers }),
        demoFetch("/api/profiles", { headers }),
      ]);

      if (patRes.ok) {
        const d = await patRes.json();
        const list: PatientFolder[] = d.patients || [];
        setPatients(list);
        setScope(d.scope || "ALL");

        const targetPatient =
          (initialPatientId && list.find((p) => p.id === initialPatientId)) ||
          (selectedPatientId && list.find((p) => p.id === selectedPatientId)) ||
          list[0];

        if (targetPatient) {
          setSelectedPatientId(targetPatient.id);
          const validCase =
            (selectedCaseId &&
              targetPatient.medicalCases.find((c) => c.id === selectedCaseId)) ||
            targetPatient.medicalCases[0];
          setSelectedCaseId(validCase?.id || null);
        } else {
          setSelectedPatientId(null);
          setSelectedCaseId(null);
        }
      }

      if (profRes.ok) {
        const pd = await profRes.json();
        const docs: DoctorRef[] = (pd.profiles || [])
          .filter((u: { doctorProfile?: DoctorRef }) => u.doctorProfile)
          .map((u: { fullName: string; email: string; avatarColor: string; doctorProfile: DoctorRef }) => ({
            ...u.doctorProfile,
            user: {
              fullName: u.fullName,
              email: u.email,
              avatarColor: u.avatarColor,
            },
          }));
        setAllDoctors(docs);
        if (!newCaseLeadDocId && docs[0]) setNewCaseLeadDocId(docs[0].id);
        if (!assignDocId && docs[0]) setAssignDocId(docs[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.id, initialPatientId]);

  const filteredPatients = patients.filter(
    (p) =>
      p.user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.folderNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activePatient =
    patients.find((p) => p.id === selectedPatientId) || patients[0] || null;

  const activeCase =
    activePatient?.medicalCases.find((c) => c.id === selectedCaseId) ||
    activePatient?.medicalCases[0] ||
    null;

  useEffect(() => {
    if (activeCase) {
      setEditStatus(activeCase.status);
      setEditDiagnosis(activeCase.diagnosis);
      setEditTreatment(activeCase.treatmentPlan);
      setEditingCase(false);
    }
  }, [activeCase?.id, activeCase?.status, activeCase?.diagnosis, activeCase?.treatmentPlan]);

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePatient) return;
    const res = await demoFetch("/api/cases", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": currentUser.id,
      },
      body: JSON.stringify({
        patientId: activePatient.id,
        departmentId: newCaseDeptId || departments[0]?.id,
        leadDoctorId: newCaseLeadDocId,
        coDoctorIds: newCaseCoDocIds,
        title: newCaseTitle,
        problemCategory: newCaseCategory,
        symptoms: newCaseSymptoms,
        diagnosis: newCaseDiagnosis,
        treatmentPlan: newCaseTreatment,
        priority: newCasePriority,
        roomBed: newCaseBed,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      onToast(data.error || "Erreur lors de l'ouverture du cas", "error");
      return;
    }
    onToast("Nouveau cas médical ouvert avec succès", "success");
    setShowNewCaseModal(false);
    setNewCaseTitle("");
    setNewCaseCategory("");
    setNewCaseSymptoms("");
    setNewCaseDiagnosis("");
    setNewCaseTreatment("");
    setNewCaseCoDocIds([]);
    setSelectedCaseId(data.medicalCase?.id || null);
    await loadData();
    onRefreshBootstrap();
  };

  const handleAssignDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCase || !assignDocId) return;
    const res = await demoFetch("/api/cases", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": currentUser.id,
      },
      body: JSON.stringify({
        action: "assign_doctor",
        medicalCaseId: activeCase.id,
        doctorId: assignDocId,
        roleInCase: assignDocRole,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      onToast(data.error || "Erreur d'affectation", "error");
      return;
    }
    onToast("Médecin affecté à ce cas médical", "success");
    await loadData();
  };

  const handleRemoveDoctor = async (doctorId: string) => {
    if (!activeCase) return;
    const res = await demoFetch("/api/cases", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": currentUser.id,
      },
      body: JSON.stringify({
        action: "remove_doctor",
        medicalCaseId: activeCase.id,
        doctorId,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      onToast(data.error || "Action impossible", "error");
      return;
    }
    onToast("Médecin retiré du cas", "success");
    await loadData();
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCase) return;
    const res = await demoFetch("/api/cases", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": currentUser.id,
      },
      body: JSON.stringify({
        action: "add_note",
        medicalCaseId: activeCase.id,
        noteType,
        content: noteContent,
        prescriptionDetails: notePrescription,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      onToast(data.error || "Erreur lors de l'ajout", "error");
      return;
    }
    onToast("Note clinique ajoutée", "success");
    setNoteContent("");
    setNotePrescription("");
    await loadData();
  };

  const handleAddVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCase) return;
    const res = await demoFetch("/api/cases", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": currentUser.id,
      },
      body: JSON.stringify({
        action: "add_vitals",
        medicalCaseId: activeCase.id,
        bloodPressure: vBp,
        heartRate: vHr,
        temperature: vTemp,
        oxygenSaturation: vSpo2,
        notes: vNotes,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      onToast(data.error || "Erreur saisie constantes", "error");
      return;
    }
    onToast("Constantes vitales enregistrées", "success");
    setVNotes("");
    await loadData();
  };

  const handleSaveCaseEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCase) return;
    const res = await demoFetch("/api/cases", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": currentUser.id,
      },
      body: JSON.stringify({
        action: "update_case",
        medicalCaseId: activeCase.id,
        status: editStatus,
        diagnosis: editDiagnosis,
        treatmentPlan: editTreatment,
      }),
    });
    if (res.ok) {
      onToast("Cas médical mis à jour", "success");
      setEditingCase(false);
      await loadData();
      onRefreshBootstrap();
    }
  };

  if (loading && patients.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
        Chargement des dossiers médicaux...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Sidebar: Patient Directory (or Own Profile Banner if Patient) */}
        {scope === "ALL" && (
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Dossiers Patients ({patients.length})
              </h3>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nom ou N° dossier..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs focus:border-sky-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              {filteredPatients.map((p) => {
                const isSelected = activePatient?.id === p.id;
                const uniqueDoctors = new Set<string>();
                p.medicalCases.forEach((mc) =>
                  mc.assignedDoctors.forEach((ad) =>
                    uniqueDoctors.add(ad.doctor.user.fullName)
                  )
                );

                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedPatientId(p.id);
                      setSelectedCaseId(p.medicalCases[0]?.id || null);
                    }}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      isSelected
                        ? "border-sky-500 bg-sky-50/70 ring-1 ring-sky-200"
                        : "border-slate-100 bg-slate-50/50 hover:border-slate-300 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-bold text-sky-700">
                        {p.folderNumber}
                      </span>
                      <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                        {p.bloodType}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {p.user.fullName}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {p.medicalCases.length} cas médical(aux) • {uniqueDoctors.size} médecin(s)
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Folder Content */}
        <div
          className={`space-y-6 ${
            scope === "ALL" ? "lg:col-span-9" : "lg:col-span-12"
          }`}
        >
          {!activePatient ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              Aucun dossier médical accessible pour cet utilisateur.
            </div>
          ) : (
            <>
              {/* Patient Header Card (Profile + Allergies + Insurance) */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-sm"
                      style={{ backgroundColor: activePatient.user.avatarColor }}
                    >
                      {activePatient.user.fullName
                        .split(" ")
                        .slice(-1)[0]
                        ?.slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-sky-100 px-2 py-0.5 font-mono text-xs font-bold text-sky-800">
                          {activePatient.folderNumber}
                        </span>
                        <span className="rounded-md bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800">
                          Groupe : {activePatient.bloodType}
                        </span>
                        {scope === "OWN" && (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                            Mon Dossier Personnel
                          </span>
                        )}
                      </div>
                      <h2 className="mt-1 text-xl font-bold text-slate-900">
                        {activePatient.user.fullName}
                      </h2>
                      <p className="text-xs text-slate-500">
                        Né(e) le {activePatient.birthDate} ({activePatient.gender}) • NSS :{" "}
                        {activePatient.nationalId} • Tél :{" "}
                        {activePatient.user.phone || "—"}
                      </p>
                    </div>
                  </div>

                  {canCreateCase && (
                    <button
                      onClick={() => setShowNewCaseModal(true)}
                      className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-700"
                    >
                      <Plus className="h-4 w-4" />
                      Ouvrir un nouveau cas médical
                    </button>
                  )}
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3">
                  <div className="rounded-xl bg-red-50/70 p-3 ring-1 ring-red-100">
                    <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-red-700">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Allergies & Antécédents
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-900">
                      {activePatient.allergies}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-600">
                      Chronique : {activePatient.chronicConditions}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200/70">
                    <p className="text-[11px] font-bold uppercase text-slate-500">
                      Personne à prévenir
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-900">
                      {activePatient.emergencyContactName}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-600">
                      {activePatient.emergencyContactPhone}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200/70">
                    <p className="text-[11px] font-bold uppercase text-slate-500">
                      Couverture Sociale / Mutuelle
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-900">
                      {activePatient.insuranceProvider}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-slate-600">
                      N° {activePatient.insuranceNumber}
                    </p>
                  </div>
                </div>
              </div>

              {/* Concurrent Medical Cases Tabs */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <FolderHeart className="h-4 w-4 text-rose-600" />
                    Cas médicaux simultanés du patient ({activePatient.medicalCases.length})
                  </h3>
                  <span className="text-xs text-slate-500">
                    Chaque cas correspond à un problème médical spécifique et son équipe de médecins
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {activePatient.medicalCases.map((mc) => {
                    const isSelected = activeCase?.id === mc.id;
                    return (
                      <button
                        key={mc.id}
                        onClick={() => setSelectedCaseId(mc.id)}
                        className={`rounded-xl border p-3.5 text-left transition ${
                          isSelected
                            ? "border-sky-500 bg-sky-50/70 ring-2 ring-sky-500/20"
                            : "border-slate-200 bg-slate-50/40 hover:bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="rounded px-2 py-0.5 text-[10px] font-bold text-white"
                            style={{ backgroundColor: mc.department.color }}
                          >
                            {mc.department.name}
                          </span>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                              CASE_STATUS_STYLES[mc.status] ||
                              CASE_STATUS_STYLES.ACTIF
                            }`}
                          >
                            {mc.status}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs font-bold text-slate-900">
                          {mc.title}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-600">
                          Référent : {mc.leadDoctor.user.fullName}
                        </p>
                        <p className="mt-0.5 text-[11px] font-medium text-sky-700">
                          {mc.assignedDoctors.length} médecin(s) sur ce cas
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Medical Case Detail */}
              {activeCase && (
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                  {/* Left 2 cols: Clinical Info + Notes + Vitals */}
                  <div className="space-y-6 xl:col-span-2">
                    {/* Case Overview & Edit */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold text-sky-700">
                              {activeCase.caseNumber}
                            </span>
                            <span
                              className="rounded-md px-2 py-0.5 text-xs font-bold text-white"
                              style={{
                                backgroundColor: activeCase.department.color,
                              }}
                            >
                              Service : {activeCase.department.name}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                PRIORITY_STYLES[activeCase.priority] ||
                                PRIORITY_STYLES.NORMALE
                              }`}
                            >
                              {activeCase.priority}
                            </span>
                            {activeCase.roomBed && (
                              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                                {activeCase.roomBed}
                              </span>
                            )}
                          </div>
                          <h3 className="mt-2 text-lg font-bold text-slate-900">
                            {activeCase.title}
                          </h3>
                          <p className="text-xs text-slate-500">
                            Catégorie : {activeCase.problemCategory} • Ouvert le{" "}
                            {formatDateTime(activeCase.openedAt)}
                          </p>
                        </div>

                        {canEditCase && (
                          <button
                            onClick={() => setEditingCase(!editingCase)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            {editingCase ? "Annuler" : "Modifier le cas"}
                          </button>
                        )}
                      </div>

                      {editingCase ? (
                        <form
                          onSubmit={handleSaveCaseEdit}
                          className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4"
                        >
                          <div>
                            <label className="block text-xs font-semibold text-slate-700">
                              Statut
                            </label>
                            <select
                              value={editStatus}
                              onChange={(e) => setEditStatus(e.target.value)}
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                            >
                              <option value="ACTIF">ACTIF</option>
                              <option value="EN_OBSERVATION">EN_OBSERVATION</option>
                              <option value="CRITIQUE">CRITIQUE</option>
                              <option value="CLOTURE">CLOTURE</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700">
                              Diagnostic
                            </label>
                            <textarea
                              rows={2}
                              value={editDiagnosis}
                              onChange={(e) => setEditDiagnosis(e.target.value)}
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700">
                              Plan de traitement
                            </label>
                            <textarea
                              rows={2}
                              value={editTreatment}
                              onChange={(e) => setEditTreatment(e.target.value)}
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                            />
                          </div>
                          <button
                            type="submit"
                            className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
                          >
                            Enregistrer les modifications
                          </button>
                        </form>
                      ) : (
                        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 text-sm">
                          <div>
                            <p className="text-xs font-bold uppercase text-slate-500">
                              Symptômes
                            </p>
                            <p className="mt-0.5 text-slate-800">
                              {activeCase.symptoms}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase text-slate-500">
                              Diagnostic médical
                            </p>
                            <p className="mt-0.5 font-medium text-slate-900">
                              {activeCase.diagnosis}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase text-slate-500">
                              Plan thérapeutique
                            </p>
                            <p className="mt-0.5 text-slate-800">
                              {activeCase.treatmentPlan}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Clinical Notes & Prescriptions */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                      <h4 className="flex items-center gap-2 text-base font-bold text-slate-900">
                        <FileText className="h-4 w-4 text-sky-600" />
                        Notes Cliniques & Prescriptions ({activeCase.clinicalNotes.length})
                      </h4>

                      {canAddNote && (
                        <form
                          onSubmit={handleAddNote}
                          className="mt-4 space-y-2.5 rounded-xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              value={canEditCase ? noteType : "OBSERVATION"}
                              onChange={(e) => setNoteType(e.target.value)}
                              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold"
                            >
                              <option value="OBSERVATION">
                                {canEditCase
                                  ? "Observation clinique"
                                  : "Observation infirmière"}
                              </option>
                              {canEditCase && (
                                <>
                                  <option value="PRESCRIPTION">
                                    Prescription médicale
                                  </option>
                                  <option value="EXAMEN">
                                    Résultat d&apos;examen
                                  </option>
                                  <option value="CONSEIL_SPECIALISTE">
                                    Avis de spécialiste
                                  </option>
                                </>
                              )}
                            </select>
                            <span className="text-[11px] text-slate-500">
                              Auteur : {currentUser.fullName}
                            </span>
                          </div>
                          <textarea
                            required
                            rows={2}
                            value={noteContent}
                            onChange={(e) => setNoteContent(e.target.value)}
                            placeholder="Saisir l'observation ou évolution clinique..."
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                          />
                          {canEditCase && (
                            <input
                              value={notePrescription}
                              onChange={(e) => setNotePrescription(e.target.value)}
                              placeholder="Détails prescription (posologie, examens) — optionnel"
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                            />
                          )}
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
                          >
                            <ClipboardPlus className="h-3.5 w-3.5" />
                            Ajouter au dossier
                          </button>
                        </form>
                      )}

                      <div className="mt-4 space-y-3">
                        {activeCase.clinicalNotes.length === 0 ? (
                          <p className="text-xs text-slate-400">
                            Aucune note clinique enregistrée pour ce cas.
                          </p>
                        ) : (
                          activeCase.clinicalNotes.map((note) => (
                            <div
                              key={note.id}
                              className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="rounded bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-800">
                                  {note.noteType}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  {formatDateTime(note.createdAt)}
                                </span>
                              </div>
                              <p className="mt-2 text-xs leading-relaxed text-slate-800">
                                {note.content}
                              </p>
                              {note.prescriptionDetails && (
                                <div className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900 ring-1 ring-emerald-200">
                                  <strong>Rx :</strong> {note.prescriptionDetails}
                                </div>
                              )}
                              <p className="mt-2 text-[11px] font-medium text-slate-500">
                                Signé par {note.authorName} ({note.authorRole})
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Col: Multi-Doctor Team & Vital Signs */}
                  <div className="space-y-6">
                    {/* Multi-Doctor Team Card */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                      <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                        <Stethoscope className="h-4 w-4 text-sky-600" />
                        Équipe Médicale sur ce cas ({activeCase.assignedDoctors.length})
                      </h4>
                      <p className="mt-1 text-xs text-slate-500">
                        Plusieurs spécialistes peuvent suivre simultanément ce problème médical.
                      </p>

                      <div className="mt-4 space-y-2.5">
                        {activeCase.assignedDoctors.map((ad) => {
                          const isLead = ad.doctorId === activeCase.leadDoctorId;
                          return (
                            <div
                              key={ad.id}
                              className="flex items-start justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3"
                            >
                              <div className="flex items-start gap-2.5">
                                <div
                                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                                  style={{
                                    backgroundColor: ad.doctor.user.avatarColor,
                                  }}
                                >
                                  {ad.doctor.user.fullName
                                    .replace("Dr. ", "")
                                    .slice(0, 2)
                                    .toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-slate-900">
                                    {ad.doctor.user.fullName}
                                  </p>
                                  <p className="text-[11px] font-medium text-sky-700">
                                    {ad.roleInCase}
                                  </p>
                                  <p className="text-[10px] text-slate-500">
                                    {ad.doctor.specialty} •{" "}
                                    {ad.doctor.department.name}
                                  </p>
                                </div>
                              </div>
                              {canAssignDoctor && !isLead && (
                                <button
                                  onClick={() => handleRemoveDoctor(ad.doctorId)}
                                  title="Retirer ce consultant"
                                  className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {canAssignDoctor && (
                        <form
                          onSubmit={handleAssignDoctor}
                          className="mt-4 space-y-2 border-t border-slate-100 pt-4"
                        >
                          <p className="text-[11px] font-bold uppercase text-slate-500">
                            Associer un autre médecin spécialiste
                          </p>
                          <select
                            value={assignDocId}
                            onChange={(e) => setAssignDocId(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
                          >
                            {allDoctors.map((doc) => (
                              <option key={doc.id} value={doc.id}>
                                {doc.user.fullName} — {doc.department.name}
                              </option>
                            ))}
                          </select>
                          <input
                            value={assignDocRole}
                            onChange={(e) => setAssignDocRole(e.target.value)}
                            placeholder="Rôle dans ce cas (ex: Néonatologue)"
                            className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
                          />
                          <button
                            type="submit"
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            Associer le spécialiste
                          </button>
                        </form>
                      )}
                    </div>

                    {/* Vital Signs Card */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                      <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                        <HeartPulse className="h-4 w-4 text-rose-600" />
                        Constantes Vitales ({activeCase.vitalSignLogs.length})
                      </h4>

                      {canRecordVitals && (
                        <form
                          onSubmit={handleAddVitals}
                          className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3"
                        >
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-semibold text-slate-600">
                                Tension (mmHg)
                              </label>
                              <input
                                value={vBp}
                                onChange={(e) => setVBp(e.target.value)}
                                className="mt-0.5 w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-slate-600">
                                Pouls (bpm)
                              </label>
                              <input
                                type="number"
                                value={vHr}
                                onChange={(e) => setVHr(Number(e.target.value))}
                                className="mt-0.5 w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-slate-600">
                                Temp. (°C)
                              </label>
                              <input
                                type="number"
                                step="0.1"
                                value={vTemp}
                                onChange={(e) => setVTemp(Number(e.target.value))}
                                className="mt-0.5 w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-slate-600">
                                SpO2 (%)
                              </label>
                              <input
                                type="number"
                                value={vSpo2}
                                onChange={(e) => setVSpo2(Number(e.target.value))}
                                className="mt-0.5 w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                              />
                            </div>
                          </div>
                          <input
                            value={vNotes}
                            onChange={(e) => setVNotes(e.target.value)}
                            placeholder="Remarque infirmière..."
                            className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                          />
                          <button
                            type="submit"
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700"
                          >
                            <Activity className="h-3.5 w-3.5" />
                            Enregistrer les constantes
                          </button>
                        </form>
                      )}

                      <div className="mt-3 space-y-2">
                        {activeCase.vitalSignLogs.length === 0 ? (
                          <p className="text-xs text-slate-400">
                            Aucun relevé enregistré.
                          </p>
                        ) : (
                          activeCase.vitalSignLogs.map((v) => (
                            <div
                              key={v.id}
                              className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs"
                            >
                              <div className="grid grid-cols-4 gap-1 text-center font-bold text-slate-900">
                                <div className="rounded bg-white p-1.5 ring-1 ring-slate-200">
                                  <span className="block text-[9px] text-slate-400">
                                    TA
                                  </span>
                                  {v.bloodPressure}
                                </div>
                                <div className="rounded bg-white p-1.5 ring-1 ring-slate-200">
                                  <span className="block text-[9px] text-slate-400">
                                    FC
                                  </span>
                                  {v.heartRate}
                                </div>
                                <div className="rounded bg-white p-1.5 ring-1 ring-slate-200">
                                  <span className="block text-[9px] text-slate-400">
                                    T°
                                  </span>
                                  {v.temperature}°
                                </div>
                                <div className="rounded bg-white p-1.5 ring-1 ring-slate-200">
                                  <span className="block text-[9px] text-slate-400">
                                    SpO2
                                  </span>
                                  {v.oxygenSaturation}%
                                </div>
                              </div>
                              {v.notes && (
                                <p className="mt-1.5 text-[11px] text-slate-600">
                                  {v.notes}
                                </p>
                              )}
                              <p className="mt-1 text-[10px] text-slate-400">
                                {v.recordedByName} • {formatDateTime(v.recordedAt)}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal: Create New Medical Case */}
      {showNewCaseModal && activePatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                Ouvrir un nouveau cas médical pour {activePatient.user.fullName}
              </h3>
              <button
                onClick={() => setShowNewCaseModal(false)}
                className="text-sm font-bold text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateCase} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Intitulé du problème médical *
                </label>
                <input
                  required
                  value={newCaseTitle}
                  onChange={(e) => setNewCaseTitle(e.target.value)}
                  placeholder="Ex: Suivi cardiologique post-opératoire"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Département *
                  </label>
                  <select
                    value={newCaseDeptId}
                    onChange={(e) => setNewCaseDeptId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Médecin Référent *
                  </label>
                  <select
                    value={newCaseLeadDocId}
                    onChange={(e) => setNewCaseLeadDocId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
                  >
                    {allDoctors.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.user.fullName} ({doc.department.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Médecins co-assignés (optionnel)
                </label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {allDoctors
                    .filter((d) => d.id !== newCaseLeadDocId)
                    .map((doc) => {
                      const checked = newCaseCoDocIds.includes(doc.id);
                      return (
                        <button
                          type="button"
                          key={doc.id}
                          onClick={() =>
                            setNewCaseCoDocIds((prev) =>
                              checked
                                ? prev.filter((x) => x !== doc.id)
                                : [...prev, doc.id]
                            )
                          }
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                            checked
                              ? "border-sky-500 bg-sky-50 text-sky-800"
                              : "border-slate-200 bg-white text-slate-600"
                          }`}
                        >
                          {checked ? "✓ " : "+ "}
                          {doc.user.fullName}
                        </button>
                      );
                    })}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Spécialité / Catégorie
                  </label>
                  <input
                    value={newCaseCategory}
                    onChange={(e) => setNewCaseCategory(e.target.value)}
                    placeholder="Ex: Urgences"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Priorité
                  </label>
                  <select
                    value={newCasePriority}
                    onChange={(e) => setNewCasePriority(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
                  >
                    <option value="NORMALE">NORMALE</option>
                    <option value="HAUTE">HAUTE</option>
                    <option value="URGENCE_VITALE">URGENCE_VITALE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Chambre / Lit
                  </label>
                  <input
                    value={newCaseBed}
                    onChange={(e) => setNewCaseBed(e.target.value)}
                    placeholder="Ex: URG-02"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Symptômes initiaux
                </label>
                <input
                  value={newCaseSymptoms}
                  onChange={(e) => setNewCaseSymptoms(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Diagnostic initial
                </label>
                <input
                  value={newCaseDiagnosis}
                  onChange={(e) => setNewCaseDiagnosis(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Plan thérapeutique
                </label>
                <textarea
                  rows={2}
                  value={newCaseTreatment}
                  onChange={(e) => setNewCaseTreatment(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewCaseModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
                >
                  Créer le cas médical
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
