"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, CreditCard, Plus, Receipt } from "lucide-react";
import {
  AuthUser,
  DepartmentSummary,
  formatCurrency,
  formatDateTime,
} from "@/types/ehospia";

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  description: string;
  totalAmount: number;
  insuranceCovered: number;
  patientResponsibility: number;
  status: string;
  issuedAt: string;
  paidAt?: string | null;
  patient: {
    id: string;
    folderNumber: string;
    user: { fullName: string };
  };
  department: DepartmentSummary;
  medicalCase?: {
    id: string;
    caseNumber: string;
    title: string;
  } | null;
}

interface PatientOpt {
  id: string;
  folderNumber: string;
  user: { fullName: string };
}

interface BillingTabProps {
  currentUser: AuthUser;
  departments: DepartmentSummary[];
  onToast: (msg: string, type?: "success" | "error") => void;
}

export default function BillingTab({
  currentUser,
  departments,
  onToast,
}: BillingTabProps) {
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [scope, setScope] = useState<"ALL" | "OWN" | "NONE">("ALL");
  const [patients, setPatients] = useState<PatientOpt[]>([]);
  const [deptOptions, setDeptOptions] = useState<
    Array<{ id: string; name: string; color: string }>
  >(departments);
  const [showNewModal, setShowNewModal] = useState(false);

  const [newPatientId, setNewPatientId] = useState("");
  const [newDeptId, setNewDeptId] = useState(departments[0]?.id || "");
  const [newDesc, setNewDesc] = useState("");
  const [newTotal, setNewTotal] = useState(500);
  const [newCovered, setNewCovered] = useState(400);

  const canManage = currentUser.effectivePermissions.includes("billing.manage");

  const loadBilling = async () => {
    const headers = { "x-user-id": currentUser.id };
    const bRes = await fetch("/api/billing", { headers });

    if (bRes.ok) {
      const data = await bRes.json();
      setInvoices(data.invoices || []);
      setScope(data.scope || "ALL");

      const patList: PatientOpt[] = data.patientOptions || [];
      setPatients(patList);
      if (!newPatientId && patList[0]) {
        setNewPatientId(patList[0].id);
      }

      const dOpts = data.departmentOptions || departments;
      setDeptOptions(dOpts);
      if (!newDeptId && dOpts[0]) {
        setNewDeptId(dOpts[0].id);
      }
    }
  };

  useEffect(() => {
    loadBilling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.id]);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/billing", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": currentUser.id,
      },
      body: JSON.stringify({
        patientId: newPatientId,
        departmentId: newDeptId || deptOptions[0]?.id,
        description: newDesc,
        totalAmount: newTotal,
        insuranceCovered: newCovered,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      onToast(data.error || "Erreur de facturation", "error");
      return;
    }
    onToast("Facture émise avec succès", "success");
    setShowNewModal(false);
    setNewDesc("");
    await loadBilling();
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    const res = await fetch("/api/billing", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": currentUser.id,
      },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      onToast("Statut de facture mis à jour", "success");
      await loadBilling();
    } else {
      const data = await res.json();
      onToast(data.error || "Accès refusé", "error");
    }
  };

  const sumTotal = invoices.reduce((s, i) => s + i.totalAmount, 0);
  const sumCovered = invoices.reduce((s, i) => s + i.insuranceCovered, 0);
  const sumPatient = invoices.reduce((s, i) => s + i.patientResponsibility, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {scope === "OWN"
              ? "Mes Factures & Prises en Charge"
              : "Console Financière & Facturation Hospitalière"}
          </h2>
          <p className="text-xs text-slate-500">
            {scope === "OWN"
              ? "Vue restreinte à vos propres factures (billing.view_own)."
              : "Suivi global des recettes, prises en charge CPAM/mutuelles et encaissements."}
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Émettre une facture
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Montant total facturé</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatCurrency(sumTotal)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500">
            Couvert par Sécurité Sociale / Mutuelle
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">
            {formatCurrency(sumCovered)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500">
            Reste à charge patient
          </p>
          <p className="mt-2 text-2xl font-bold text-rose-700">
            {formatCurrency(sumPatient)}
          </p>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">N° Facture</th>
                <th className="px-4 py-3">Patient & Service</th>
                <th className="px-4 py-3">Prestation</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Mutuelle</th>
                <th className="px-4 py-3 text-right">Reste dû</th>
                <th className="px-4 py-3">Statut</th>
                {canManage && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1 font-mono font-bold text-slate-900">
                      <Receipt className="h-3.5 w-3.5 text-slate-400" />
                      {inv.invoiceNumber}
                    </span>
                    <p className="text-[10px] text-slate-400">
                      {formatDateTime(inv.issuedAt)}
                    </p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-bold text-slate-900">
                      {inv.patient.user.fullName}
                    </p>
                    <span
                      className="mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
                      style={{ backgroundColor: inv.department.color }}
                    >
                      {inv.department.name}
                    </span>
                  </td>
                  <td className="max-w-xs px-4 py-3.5 text-slate-700">
                    {inv.description}
                    {inv.medicalCase && (
                      <p className="mt-0.5 font-mono text-[10px] text-sky-700">
                        {inv.medicalCase.caseNumber}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-slate-900">
                    {formatCurrency(inv.totalAmount)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-medium text-emerald-700">
                    {formatCurrency(inv.insuranceCovered)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold text-rose-700">
                    {formatCurrency(inv.patientResponsibility)}
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        inv.status === "PAYEE"
                          ? "bg-emerald-100 text-emerald-800"
                          : inv.status === "PRISE_EN_CHARGE"
                            ? "bg-sky-100 text-sky-800"
                            : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  {canManage && (
                    <td className="px-4 py-3.5 text-right">
                      {inv.status !== "PAYEE" ? (
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleUpdateStatus(inv.id, "PAYEE")}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Encaisser
                          </button>
                          {inv.status !== "PRISE_EN_CHARGE" && (
                            <button
                              onClick={() =>
                                handleUpdateStatus(inv.id, "PRISE_EN_CHARGE")
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700"
                            >
                              <CreditCard className="h-3 w-3" />
                              Mutuelle
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] font-semibold text-emerald-600">
                          Soldée
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">
              Émettre une nouvelle facture
            </h3>
            <form onSubmit={handleCreateInvoice} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Patient *
                </label>
                <select
                  value={newPatientId}
                  onChange={(e) => setNewPatientId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.user.fullName} ({p.folderNumber})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Département *
                </label>
                <select
                  value={newDeptId}
                  onChange={(e) => setNewDeptId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                >
                  {deptOptions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Libellé de la prestation *
                </label>
                <input
                  required
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Ex: Consultation spécialisée + imagerie"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Montant total (€)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newTotal}
                    onChange={(e) => setNewTotal(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Part mutuelle (€)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={newTotal}
                    value={newCovered}
                    onChange={(e) => setNewCovered(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  Créer la facture
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
