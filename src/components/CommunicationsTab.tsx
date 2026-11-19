"use client";

import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowRightLeft,
  Check,
  CheckCircle2,
  MessageSquare,
  Send,
  XCircle,
} from "lucide-react";
import {
  AuthUser,
  DepartmentSummary,
  PRIORITY_STYLES,
  formatDateTime,
} from "@/types/ehospia";

interface DeptMessage {
  id: string;
  fromDepartmentId: string;
  toDepartmentId: string;
  senderName: string;
  senderRole: string;
  subject: string;
  content: string;
  messageType: string;
  priority: string;
  status: string;
  createdAt: string;
  fromDepartment: DepartmentSummary;
  toDepartment: DepartmentSummary;
  medicalCase?: {
    id: string;
    caseNumber: string;
    title: string;
    patient: { user: { fullName: string } };
  } | null;
}

interface DeptTransfer {
  id: string;
  medicalCaseId: string;
  reason: string;
  clinicalSummary: string;
  priority: string;
  status: string;
  requestedByName: string;
  createdAt: string;
  resolvedAt?: string | null;
  fromDepartment: DepartmentSummary;
  toDepartment: DepartmentSummary;
  targetDoctor?: { user: { fullName: string } } | null;
  medicalCase: {
    id: string;
    caseNumber: string;
    title: string;
    patient: { user: { fullName: string } };
  };
}

interface CaseOption {
  id: string;
  caseNumber: string;
  title: string;
  departmentId: string;
  departmentName: string;
  patientName: string;
}

interface DoctorOption {
  id: string;
  fullName: string;
  departmentName: string;
}

interface CommunicationsTabProps {
  currentUser: AuthUser;
  departments: DepartmentSummary[];
  onToast: (msg: string, type?: "success" | "error") => void;
  onRefreshBootstrap: () => void;
}

export default function CommunicationsTab({
  currentUser,
  departments,
  onToast,
  onRefreshBootstrap,
}: CommunicationsTabProps) {
  const [subTab, setSubTab] = useState<"messages" | "transfers">("messages");
  const [messages, setMessages] = useState<DeptMessage[]>([]);
  const [transfers, setTransfers] = useState<DeptTransfer[]>([]);
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [deptFilter, setDeptFilter] = useState<string>("ALL");

  const perms = new Set(currentUser.effectivePermissions);
  const canCommunicate = perms.has("departments.communicate");
  const canTransfer = perms.has("departments.transfer");

  // New message form state
  const defaultFromDept =
    currentUser.doctorProfile?.departmentId ||
    currentUser.nurseProfile?.departmentId ||
    departments[0]?.id ||
    "";
  const [msgFromDept, setMsgFromDept] = useState(defaultFromDept);
  const [msgToDept, setMsgToDept] = useState(departments[1]?.id || "");
  const [msgType, setMsgType] = useState("AVIS_SPECIALISTE");
  const [msgPriority, setMsgPriority] = useState("NORMALE");
  const [msgCaseId, setMsgCaseId] = useState("");
  const [msgSubject, setMsgSubject] = useState("");
  const [msgContent, setMsgContent] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  // New transfer form state
  const [trCaseId, setTrCaseId] = useState("");
  const [trToDept, setTrToDept] = useState("");
  const [trDoctorId, setTrDoctorId] = useState("");
  const [trPriority, setTrPriority] = useState("URGENTE");
  const [trReason, setTrReason] = useState("");
  const [trSummary, setTrSummary] = useState("");
  const [sendingTransfer, setSendingTransfer] = useState(false);

  const loadData = async () => {
    const headers = { "x-user-id": currentUser.id };
    const [msgRes, trRes, patRes, profRes] = await Promise.all([
      fetch("/api/communications", { headers }),
      fetch("/api/transfers", { headers }),
      fetch("/api/patients", { headers }),
      fetch("/api/profiles", { headers }),
    ]);

    if (msgRes.ok) {
      const d = await msgRes.json();
      setMessages(d.messages || []);
    }
    if (trRes.ok) {
      const d = await trRes.json();
      setTransfers(d.transfers || []);
    }
    if (patRes.ok) {
      const d = await patRes.json();
      const caseList: CaseOption[] = [];
      for (const p of d.patients || []) {
        for (const mc of p.medicalCases || []) {
          caseList.push({
            id: mc.id,
            caseNumber: mc.caseNumber,
            title: mc.title,
            departmentId: mc.departmentId,
            departmentName: mc.department?.name || "",
            patientName: p.user?.fullName || "",
          });
        }
      }
      setCases(caseList);
      if (!trCaseId && caseList[0]) {
        setTrCaseId(caseList[0].id);
      }
    }
    if (profRes.ok) {
      const d = await profRes.json();
      const docList: DoctorOption[] = (d.profiles || [])
        .filter((u: { doctorProfile?: { id: string } }) => u.doctorProfile)
        .map(
          (u: {
            fullName: string;
            doctorProfile: { id: string; department?: { name: string } };
          }) => ({
            id: u.doctorProfile.id,
            fullName: u.fullName,
            departmentName: u.doctorProfile.department?.name || "",
          })
        );
      setDoctors(docList);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.id]);

  useEffect(() => {
    if (!msgFromDept && departments[0]) setMsgFromDept(departments[0].id);
    if (!msgToDept && departments[1]) setMsgToDept(departments[1].id);
    if (!trToDept && departments[2]) setTrToDept(departments[2].id);
  }, [departments, msgFromDept, msgToDept, trToDept]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingMsg(true);
    try {
      const res = await fetch("/api/communications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id,
        },
        body: JSON.stringify({
          fromDepartmentId: msgFromDept,
          toDepartmentId: msgToDept,
          medicalCaseId: msgCaseId || undefined,
          subject: msgSubject,
          content: msgContent,
          messageType: msgType,
          priority: msgPriority,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onToast(data.error || "Erreur d'envoi", "error");
        return;
      }
      onToast("Message inter-services envoyé", "success");
      setMsgSubject("");
      setMsgContent("");
      await loadData();
      onRefreshBootstrap();
    } finally {
      setSendingMsg(false);
    }
  };

  const handleUpdateMsgStatus = async (id: string, status: string) => {
    const res = await fetch("/api/communications", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": currentUser.id,
      },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      await loadData();
      onRefreshBootstrap();
    }
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingTransfer(true);
    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id,
        },
        body: JSON.stringify({
          medicalCaseId: trCaseId,
          toDepartmentId: trToDept,
          targetDoctorId: trDoctorId || undefined,
          priority: trPriority,
          reason: trReason,
          clinicalSummary: trSummary,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onToast(data.error || "Erreur lors de la demande de transfert", "error");
        return;
      }
      onToast("Demande de transfert inter-services créée", "success");
      setTrReason("");
      setTrSummary("");
      await loadData();
      onRefreshBootstrap();
    } finally {
      setSendingTransfer(false);
    }
  };

  const handleResolveTransfer = async (
    id: string,
    status: "ACCEPTE" | "REFUSE"
  ) => {
    const res = await fetch("/api/transfers", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": currentUser.id,
      },
      body: JSON.stringify({ id, status }),
    });
    const data = await res.json();
    if (!res.ok) {
      onToast(data.error || "Impossible de traiter le transfert", "error");
      return;
    }
    onToast(
      status === "ACCEPTE"
        ? "Transfert accepté ! Le cas médical et les lits ont été transférés."
        : "Transfert refusé.",
      "success"
    );
    await loadData();
    onRefreshBootstrap();
  };

  const filteredMessages =
    deptFilter === "ALL"
      ? messages
      : messages.filter(
          (m) =>
            m.fromDepartmentId === deptFilter || m.toDepartmentId === deptFilter
        );

  const pendingTransfersCount = transfers.filter(
    (t) => t.status === "EN_ATTENTE"
  ).length;

  return (
    <div className="space-y-6">
      {/* Sub-navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex gap-2">
          <button
            onClick={() => setSubTab("messages")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              subTab === "messages"
                ? "bg-sky-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            Messagerie Inter-Services ({messages.length})
          </button>
          <button
            onClick={() => setSubTab("transfers")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              subTab === "transfers"
                ? "bg-sky-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <ArrowRightLeft className="h-4 w-4" />
            Transferts de Patients ({pendingTransfersCount} en attente)
          </button>
        </div>

        {subTab === "messages" && (
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
          >
            <option value="ALL">Tous les départements (8)</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                Service : {d.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {subTab === "messages" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Compose Form */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-1">
            <h3 className="text-base font-bold text-slate-900">
              Nouveau message inter-services
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Assure la coordination directe entre Urgences, Déchocage, Réa, Maternité, Néonat, etc.
            </p>

            {!canCommunicate ? (
              <div className="mt-4 rounded-xl bg-amber-50 p-4 text-xs text-amber-800">
                Votre rôle actuel ne dispose pas de la permission{" "}
                <code>departments.communicate</code>.
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Service émetteur
                    </label>
                    <select
                      value={msgFromDept}
                      onChange={(e) => setMsgFromDept(e.target.value)}
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
                      Service destinataire
                    </label>
                    <select
                      value={msgToDept}
                      onChange={(e) => setMsgToDept(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Type
                    </label>
                    <select
                      value={msgType}
                      onChange={(e) => setMsgType(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
                    >
                      <option value="AVIS_SPECIALISTE">Avis Spécialiste</option>
                      <option value="ALERTE_URGENCE">Alerte Urgence</option>
                      <option value="DISPONIBILITE_LIT">Disponibilité Lit</option>
                      <option value="COORDINATION">Coordination</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Priorité
                    </label>
                    <select
                      value={msgPriority}
                      onChange={(e) => setMsgPriority(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
                    >
                      <option value="NORMALE">Normale</option>
                      <option value="URGENTE">Urgente</option>
                      <option value="CRITIQUE">Critique</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Cas médical lié (optionnel)
                  </label>
                  <select
                    value={msgCaseId}
                    onChange={(e) => setMsgCaseId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
                  >
                    <option value="">— Aucun cas associé —</option>
                    {cases.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.caseNumber} • {c.patientName} ({c.title})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Objet
                  </label>
                  <input
                    required
                    value={msgSubject}
                    onChange={(e) => setMsgSubject(e.target.value)}
                    placeholder="Ex: Demande d'avis spécialisé / Place en couveuse"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Message
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={msgContent}
                    onChange={(e) => setMsgContent(e.target.value)}
                    placeholder="Détails cliniques ou logistiques..."
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={sendingMsg}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                  {sendingMsg ? "Envoi..." : "Envoyer au service"}
                </button>
              </form>
            )}
          </div>

          {/* Messages Feed */}
          <div className="space-y-3 lg:col-span-2">
            {filteredMessages.map((msg) => (
              <div
                key={msg.id}
                className={`rounded-2xl border bg-white p-5 shadow-sm transition ${
                  msg.status === "NON_LU"
                    ? "border-sky-300 ring-1 ring-sky-100"
                    : "border-slate-200"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-md px-2 py-0.5 text-xs font-bold text-white"
                      style={{ backgroundColor: msg.fromDepartment.color }}
                    >
                      {msg.fromDepartment.name}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                    <span
                      className="rounded-md px-2 py-0.5 text-xs font-bold text-white"
                      style={{ backgroundColor: msg.toDepartment.color }}
                    >
                      {msg.toDepartment.name}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        PRIORITY_STYLES[msg.priority] || PRIORITY_STYLES.NORMALE
                      }`}
                    >
                      {msg.priority}
                    </span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      {msg.messageType}
                    </span>
                  </div>

                  <span className="text-xs text-slate-400">
                    {formatDateTime(msg.createdAt)}
                  </span>
                </div>

                <h4 className="mt-3 text-base font-bold text-slate-900">
                  {msg.subject}
                </h4>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                  {msg.content}
                </p>

                {msg.medicalCase && (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-slate-700 ring-1 ring-slate-200">
                    <span className="font-mono font-bold text-sky-700">
                      {msg.medicalCase.caseNumber}
                    </span>
                    <span>• {msg.medicalCase.patient.user.fullName}</span>
                    <span className="text-slate-500">
                      ({msg.medicalCase.title})
                    </span>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <span className="text-xs text-slate-500">
                    Émis par <strong className="text-slate-800">{msg.senderName}</strong>{" "}
                    ({msg.senderRole})
                  </span>

                  {canCommunicate && (
                    <div className="flex items-center gap-2">
                      {msg.status === "NON_LU" && (
                        <button
                          onClick={() => handleUpdateMsgStatus(msg.id, "LU")}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Marquer lu
                        </button>
                      )}
                      {msg.status !== "TRAITE" ? (
                        <button
                          onClick={() => handleUpdateMsgStatus(msg.id, "TRAITE")}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Marquer traité
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Traité
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Transfers Section */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Request Transfer Form */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-1">
            <h3 className="text-base font-bold text-slate-900">
              Initier un transfert inter-services
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Lorsqu&apos;un transfert est accepté, le cas médical est basculé vers le nouveau département et les lits sont ajustés.
            </p>

            {!canTransfer ? (
              <div className="mt-4 rounded-xl bg-amber-50 p-4 text-xs text-amber-800">
                Votre rôle actuel ne dispose pas de la permission{" "}
                <code>departments.transfer</code>.
              </div>
            ) : (
              <form onSubmit={handleCreateTransfer} className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Cas médical à transférer
                  </label>
                  <select
                    required
                    value={trCaseId}
                    onChange={(e) => setTrCaseId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
                  >
                    {cases.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.caseNumber} • {c.patientName} [Actuel : {c.departmentName}]
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Service d&apos;accueil
                    </label>
                    <select
                      required
                      value={trToDept}
                      onChange={(e) => setTrToDept(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.totalBeds - d.occupiedBeds} lits libres)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Priorité
                    </label>
                    <select
                      value={trPriority}
                      onChange={(e) => setTrPriority(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
                    >
                      <option value="NORMALE">Normale</option>
                      <option value="URGENTE">Urgente</option>
                      <option value="VITALE">Vitale</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Médecin récepteur souhaité (optionnel)
                  </label>
                  <select
                    value={trDoctorId}
                    onChange={(e) => setTrDoctorId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
                  >
                    <option value="">— Au médecin de garde du service —</option>
                    {doctors.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.fullName} ({doc.departmentName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Motif du transfert
                  </label>
                  <input
                    required
                    value={trReason}
                    onChange={(e) => setTrReason(e.target.value)}
                    placeholder="Ex: Surveillance post-déchocage en Réanimation"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Résumé clinique pour le service receveur
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={trSummary}
                    onChange={(e) => setTrSummary(e.target.value)}
                    placeholder="Constantes, traitements en cours, examens réalisés..."
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={sendingTransfer}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  <ArrowRightLeft className="h-4 w-4" />
                  {sendingTransfer ? "Création..." : "Soumettre la demande"}
                </button>
              </form>
            )}
          </div>

          {/* Transfers List */}
          <div className="space-y-3 lg:col-span-2">
            {transfers.map((tr) => (
              <div
                key={tr.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-md px-2.5 py-0.5 text-xs font-bold text-white"
                      style={{ backgroundColor: tr.fromDepartment.color }}
                    >
                      {tr.fromDepartment.name}
                    </span>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                    <span
                      className="rounded-md px-2.5 py-0.5 text-xs font-bold text-white"
                      style={{ backgroundColor: tr.toDepartment.color }}
                    >
                      {tr.toDepartment.name}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        PRIORITY_STYLES[tr.priority] || PRIORITY_STYLES.NORMALE
                      }`}
                    >
                      {tr.priority}
                    </span>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      tr.status === "ACCEPTE"
                        ? "bg-emerald-100 text-emerald-800"
                        : tr.status === "REFUSE"
                          ? "bg-red-100 text-red-800"
                          : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {tr.status === "EN_ATTENTE"
                      ? "EN ATTENTE"
                      : tr.status === "ACCEPTE"
                        ? "ACCEPTÉ & TRANSFÉRÉ"
                        : "REFUSÉ"}
                  </span>
                </div>

                <div className="mt-3">
                  <p className="text-xs font-semibold text-sky-700">
                    {tr.medicalCase.caseNumber} • Patient :{" "}
                    {tr.medicalCase.patient.user.fullName}
                  </p>
                  <h4 className="mt-1 text-base font-bold text-slate-900">
                    {tr.reason}
                  </h4>
                  <p className="mt-1 text-sm text-slate-600">
                    {tr.clinicalSummary}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  <div className="text-xs text-slate-500">
                    Demandé par{" "}
                    <strong className="text-slate-800">{tr.requestedByName}</strong>{" "}
                    le {formatDateTime(tr.createdAt)}
                    {tr.targetDoctor && (
                      <span>
                        {" "}
                        • Médecin cible :{" "}
                        <strong>{tr.targetDoctor.user.fullName}</strong>
                      </span>
                    )}
                  </div>

                  {tr.status === "EN_ATTENTE" && canTransfer && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleResolveTransfer(tr.id, "ACCEPTE")}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Accepter le transfert
                      </button>
                      <button
                        onClick={() => handleResolveTransfer(tr.id, "REFUSE")}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Refuser
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
