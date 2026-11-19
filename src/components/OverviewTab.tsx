"use client";

import React from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRightLeft,
  BedDouble,
  Building2,
  CreditCard,
  FolderHeart,
  MessageSquare,
  Receipt,
  ShieldCheck,
  Stethoscope,
  UserCheck,
  Users,
} from "lucide-react";
import {
  ALERT_LEVEL_STYLES,
  AuthUser,
  CASE_STATUS_STYLES,
  DepartmentSummary,
  PROFILE_TYPE_LABELS,
  RoleContext,
  formatCurrency,
} from "@/types/ehospia";

interface OverviewTabProps {
  currentUser: AuthUser;
  departments: DepartmentSummary[];
  roleContext: RoleContext;
  onNavigateTab: (tab: string) => void;
  onSelectDepartment: (deptId: string) => void;
}

export default function OverviewTab({
  currentUser,
  departments,
  roleContext,
  onNavigateTab,
  onSelectDepartment,
}: OverviewTabProps) {
  const perms = new Set(currentUser.effectivePermissions);
  const canViewDepartments = perms.has("departments.view");
  const canViewOwnFolder = perms.has("folder.view_own");
  const canViewAllBilling = perms.has("billing.view_all");

  const totalBeds = departments.reduce((acc, d) => acc + d.totalBeds, 0);
  const occupiedBeds = departments.reduce((acc, d) => acc + d.occupiedBeds, 0);
  const availableBeds = Math.max(0, totalBeds - occupiedBeds);
  const occupancyRate =
    totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  const activeCases = departments.reduce(
    (acc, d) => acc + (d._count?.medicalCases || 0),
    0
  );
  const unreadMessages = departments.reduce(
    (acc, d) => acc + (d._count?.incomingMessages || 0),
    0
  );
  const pendingTransfers = departments.reduce(
    (acc, d) => acc + (d._count?.incomingTransfers || 0),
    0
  );

  const criticalDepts = departments.filter(
    (d) => d.alertLevel === "CRITIQUE" || d.alertLevel === "TENSION"
  );

  const patientSummary = roleContext.patientFolderSummary;
  const billingSummary = roleContext.billingSummary;

  return (
    <div className="space-y-6">
      {/* Welcome Banner with RBAC Context */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/20 px-3 py-1 text-xs font-semibold text-sky-200 ring-1 ring-sky-400/30">
                <ShieldCheck className="h-3.5 w-3.5" />
                Profil :{" "}
                {PROFILE_TYPE_LABELS[currentUser.profileType] ||
                  currentUser.profileType}
              </span>
              {currentUser.roleNames.map((r) => (
                <span
                  key={r}
                  className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-200"
                >
                  {r}
                </span>
              ))}
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              Bienvenue sur E-HOSPIA, {currentUser.fullName}
            </h2>
            <p className="max-w-2xl text-sm text-slate-300">
              {currentUser.profileType === "PATIENT"
                ? `Votre portail patient confidentiel (${currentUser.patientProfile?.folderNumber}) vous donne uniquement accès à votre profil de santé, vos cas médicaux, vos médecins traitants et vos factures.`
                : currentUser.profileType === "FINANCIAL"
                  ? "Portail financier dédié à la facturation hospitalière, aux prises en charge mutuelles et au suivi des encaissements."
                  : currentUser.profileType === "ADMIN"
                    ? "Pilotage administratif des 8 départements, capacité d'hospitalisation (lits occupés et disponibles), annuaire et gestion des habilitations RBAC."
                    : "Plateforme de coordination clinique entre les 8 départements hospitaliers, gestion des capacités en lits et dossiers médicaux multi-médecins."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {(perms.has("folder.view_all") || perms.has("folder.view_own")) && (
              <button
                onClick={() => onNavigateTab("folders")}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-400"
              >
                <FolderHeart className="h-4 w-4" />
                {currentUser.profileType === "PATIENT"
                  ? "Mon Dossier Médical Complet"
                  : "Dossiers Médicaux & Cas"}
              </button>
            )}
            {perms.has("departments.communicate") && (
              <button
                onClick={() => onNavigateTab("communications")}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/20"
              >
                <MessageSquare className="h-4 w-4" />
                Messagerie & Transferts
              </button>
            )}
            {(perms.has("billing.view_all") || perms.has("billing.view_own")) &&
              !canViewDepartments && (
                <button
                  onClick={() => onNavigateTab("billing")}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-400"
                >
                  <Receipt className="h-4 w-4" />
                  {perms.has("billing.view_all")
                    ? "Console Facturation"
                    : "Mes Factures"}
                </button>
              )}
          </div>
        </div>
      </div>

      {/* 1. HOSPITAL CAPACITY VIEW: ONLY for Administration, Doctors, Nurses (departments.view) */}
      {canViewDepartments && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">
                  Départements actifs
                </span>
                <span className="rounded-lg bg-sky-50 p-2 text-sky-600">
                  <Building2 className="h-5 w-5" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900">
                  {departments.length}
                </span>
                <span className="text-xs font-medium text-amber-600">
                  dont {criticalDepts.length} en tension/critique
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">
                  Lits occupés / Lits vides
                </span>
                <span className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                  <BedDouble className="h-5 w-5" />
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900">
                  {occupiedBeds}/{totalBeds}
                </span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                  {availableBeds} lits vides ({occupancyRate}%)
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">
                  Cas médicaux actifs
                </span>
                <span className="rounded-lg bg-rose-50 p-2 text-rose-600">
                  <Activity className="h-5 w-5" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900">
                  {activeCases}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  prises en charge en cours
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">
                  Flux Inter-Services
                </span>
                <span className="rounded-lg bg-amber-50 p-2 text-amber-600">
                  <ArrowRightLeft className="h-5 w-5" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-3">
                <span className="text-3xl font-bold text-slate-900">
                  {pendingTransfers}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  transferts • {unreadMessages} msg non lus
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Cartographie & Capacité en Lits des 8 Départements
                </h3>
                <p className="text-sm text-slate-500">
                  Accès réservé au personnel habilité (Administration, Médecins, Infirmiers).
                </p>
              </div>
              <button
                onClick={() => onNavigateTab("departments")}
                className="text-sm font-semibold text-sky-600 hover:text-sky-700"
              >
                Ouvrir la gestion des services →
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {departments.map((dept) => {
                const pct =
                  dept.totalBeds > 0
                    ? Math.round((dept.occupiedBeds / dept.totalBeds) * 100)
                    : 0;
                const freeBeds = Math.max(0, dept.totalBeds - dept.occupiedBeds);
                const alertClass =
                  ALERT_LEVEL_STYLES[dept.alertLevel] ||
                  ALERT_LEVEL_STYLES.NORMAL;

                return (
                  <button
                    key={dept.id}
                    onClick={() => {
                      onSelectDepartment(dept.id);
                      onNavigateTab("departments");
                    }}
                    className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-left transition hover:border-sky-300 hover:bg-white hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="h-3.5 w-3.5 rounded-full ring-2 ring-white shadow-sm"
                            style={{ backgroundColor: dept.color }}
                          />
                          <h4 className="font-bold text-slate-900 group-hover:text-sky-700">
                            {dept.name}
                          </h4>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${alertClass}`}
                        >
                          {dept.alertLevel === "CRITIQUE" && (
                            <AlertTriangle className="h-3 w-3" />
                          )}
                          {dept.alertLevel}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-slate-500">
                        {dept.floor} • Poste {dept.phoneExtension}
                      </p>
                    </div>

                    <div className="mt-4 space-y-2.5">
                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs font-medium">
                          <span className="text-slate-600">
                            {dept.occupiedBeds}/{dept.totalBeds} occupés ({pct}%)
                          </span>
                          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700">
                            {freeBeds} lits vides
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, pct)}%`,
                              backgroundColor:
                                pct >= 85
                                  ? "#dc2626"
                                  : pct >= 70
                                    ? "#f59e0b"
                                    : dept.color,
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-200/80 pt-2.5 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <Stethoscope className="h-3.5 w-3.5 text-sky-600" />
                          {dept._count?.doctors ?? 0} méd.
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-teal-600" />
                          {dept._count?.nurses ?? 0} inf.
                        </span>
                        <span className="font-semibold text-slate-800">
                          {dept._count?.medicalCases ?? 0} cas actifs
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* 2. PATIENT PORTAL VIEW: Strict confidentiality — NO hospital bed/capacity info */}
      {!canViewDepartments && canViewOwnFolder && currentUser.patientProfile && (
        <div className="space-y-6">
          {/* Patient Identity & Medical Summary */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <UserCheck className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Mon Profil Santé & Informations Confidentielles
                  </h3>
                  <p className="text-xs text-slate-500">
                    Dossier N°{" "}
                    <strong className="font-mono text-sky-700">
                      {currentUser.patientProfile.folderNumber}
                    </strong>{" "}
                    • Groupe sanguin :{" "}
                    <strong className="text-rose-700">
                      {currentUser.patientProfile.bloodType}
                    </strong>{" "}
                    • Né(e) le {currentUser.patientProfile.birthDate}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                Accès strictement personnel
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-red-50/70 p-3.5 ring-1 ring-red-100">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-red-700">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Allergies & Antécédents
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-900">
                  {currentUser.patientProfile.allergies}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-600">
                  {currentUser.patientProfile.chronicConditions}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3.5 ring-1 ring-slate-200/70">
                <p className="text-[11px] font-bold uppercase text-slate-500">
                  Contact d&apos;urgence
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-900">
                  {currentUser.patientProfile.emergencyContactName}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-600">
                  {currentUser.patientProfile.emergencyContactPhone}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3.5 ring-1 ring-slate-200/70">
                <p className="text-[11px] font-bold uppercase text-slate-500">
                  Couverture Mutuelle
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-900">
                  {currentUser.patientProfile.insuranceProvider}
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-slate-600">
                  N° {currentUser.patientProfile.insuranceNumber}
                </p>
              </div>
            </div>
          </div>

          {/* Patient Personal KPIs */}
          {patientSummary && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <span className="text-xs font-medium text-slate-500">
                    Mes Cas Médicaux suivis
                  </span>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {patientSummary.medicalCases.length}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    prises en charge actives dans votre dossier
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <span className="text-xs font-medium text-slate-500">
                    Mes Médecins Spécialistes
                  </span>
                  <p className="mt-2 text-3xl font-bold text-sky-700">
                    {
                      new Set(
                        patientSummary.medicalCases.flatMap((mc) =>
                          mc.assignedDoctors.map((ad) => ad.doctor.user.fullName)
                        )
                      ).size
                    }
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    praticiens dédiés à vos pathologies
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <span className="text-xs font-medium text-slate-500">
                    Mes Factures Hospitalières
                  </span>
                  <p className="mt-2 text-3xl font-bold text-rose-700">
                    {formatCurrency(
                      patientSummary.invoices.reduce(
                        (s, inv) => s + inv.patientResponsibility,
                        0
                      )
                    )}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    reste à charge sur {patientSummary.invoices.length}{" "}
                    facture(s)
                  </p>
                </div>
              </div>

              {/* Patient's own medical cases & assigned doctors */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Mes Cas Médicaux & Équipes Soignantes
                    </h3>
                    <p className="text-xs text-slate-500">
                      Suivez chaque problème médical et les médecins affectés à votre prise en charge.
                    </p>
                  </div>
                  <button
                    onClick={() => onNavigateTab("folders")}
                    className="text-xs font-semibold text-sky-600 hover:text-sky-700"
                  >
                    Voir notes & constantes →
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {patientSummary.medicalCases.map((mc) => (
                    <div
                      key={mc.id}
                      className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-4"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="rounded-md px-2 py-0.5 text-[11px] font-bold text-white"
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
                        <h4 className="mt-2.5 text-sm font-bold text-slate-900">
                          {mc.title}
                        </h4>
                        <p className="mt-1 font-mono text-[11px] text-sky-700">
                          {mc.caseNumber}
                          {mc.roomBed ? ` • Chambre/Lit : ${mc.roomBed}` : ""}
                        </p>
                      </div>

                      <div className="mt-3 space-y-1.5 border-t border-slate-200/80 pt-3">
                        <p className="text-[11px] font-bold text-slate-600">
                          Médecins en charge :
                        </p>
                        {mc.assignedDoctors.map((ad, i) => (
                          <p key={i} className="text-xs text-slate-700">
                            • <strong>{ad.doctor.user.fullName}</strong>{" "}
                            <span className="text-[11px] text-slate-500">
                              ({ad.roleInCase})
                            </span>
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* 3. FINANCIAL PORTAL VIEW: NO hospital capacity or clinical folders */}
      {!canViewDepartments && canViewAllBilling && billingSummary && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-sm font-medium text-slate-500">
                Total Facturé
              </span>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {formatCurrency(billingSummary.totalBilled)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                sur {billingSummary.invoiceCount} facture(s) émises
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-sm font-medium text-slate-500">
                Prise en charge CPAM / Mutuelles
              </span>
              <p className="mt-2 text-2xl font-bold text-emerald-700">
                {formatCurrency(billingSummary.totalCovered)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-sm font-medium text-slate-500">
                Reste à charge Patients
              </span>
              <p className="mt-2 text-2xl font-bold text-rose-700">
                {formatCurrency(billingSummary.totalPatientResponsibility)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">
                  Dossiers en attente
                </span>
                <CreditCard className="h-5 w-5 text-amber-600" />
              </div>
              <p className="mt-2 text-2xl font-bold text-amber-700">
                {billingSummary.pendingCount} en attente
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {billingSummary.paidCount} facture(s) soldée(s)
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Gestion Financière & Tiers-Payant
              </h3>
              <p className="text-xs text-slate-500">
                Conformément au cloisonnement RBAC, votre profil accède uniquement aux données financières et factures.
              </p>
            </div>
            <button
              onClick={() => onNavigateTab("billing")}
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              Gérer les factures →
            </button>
          </div>
        </div>
      )}

      {/* Role-based Access Summary Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Vos permissions effectives actuelles (
              {currentUser.effectivePermissions.length} autorisations)
            </h4>
            <p className="text-xs text-slate-500">
              Calculées dynamiquement par cumul de vos rôles (
              {currentUser.roleNames.join(", ")}).
            </p>
          </div>
          {perms.has("rbac.manage") && (
            <button
              onClick={() => onNavigateTab("rbac")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Configurer la matrice RBAC
            </button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {currentUser.effectivePermissions.map((code) => (
            <span
              key={code}
              className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] font-medium text-slate-700"
            >
              {code}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
