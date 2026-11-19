"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Activity,
  ArrowRightLeft,
  Bot,
  Building2,
  FolderHeart,
  Hospital,
  KeyRound,
  LayoutDashboard,
  Lock,
  LogIn,
  LogOut,
  Mail,
  Receipt,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import {
  AiPublicConfig,
  AuthUser,
  DepartmentSummary,
  PROFILE_TYPE_BADGES,
  PROFILE_TYPE_LABELS,
  PermissionItem,
  RoleContext,
} from "@/types/ehospia";
import OverviewTab from "@/components/OverviewTab";
import DepartmentsTab from "@/components/DepartmentsTab";
import CommunicationsTab from "@/components/CommunicationsTab";
import MedicalFoldersTab from "@/components/MedicalFoldersTab";
import ProfilesTab from "@/components/ProfilesTab";
import BillingTab from "@/components/BillingTab";
import RbacTab from "@/components/RbacTab";
import AiSettingsTab from "@/components/AiSettingsTab";
import AiAssistantDrawer from "@/components/AiAssistantDrawer";

const VALID_TABS = new Set([
  "overview",
  "departments",
  "communications",
  "folders",
  "profiles",
  "billing",
  "rbac",
  "ai-settings",
]);
const ACTIVE_TAB_STORAGE_KEY = "ehospia_active_tab";
const SELECTED_DEPT_STORAGE_KEY = "ehospia_selected_dept_id";
const SELECTED_PATIENT_STORAGE_KEY = "ehospia_selected_patient_id";

export default function EHospiaApp() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [departments, setDepartments] = useState<DepartmentSummary[]>([]);
  const [allPermissions, setAllPermissions] = useState<PermissionItem[]>([]);
  const [roleContext, setRoleContext] = useState<RoleContext>({});
  const [aiConfig, setAiConfig] = useState<AiPublicConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<string>("overview");
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const [showPermInspector, setShowPermInspector] = useState(false);
  const [showAiDrawer, setShowAiDrawer] = useState(false);

  // Login screen state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [submittingLogin, setSubmittingLogin] = useState(false);

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = useCallback(
    (message: string, type: "success" | "error" = "success") => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 4000);
    },
    []
  );

  const loadBootstrap = useCallback(async () => {
    try {
      const res = await fetch("/api/bootstrap", {
        credentials: "include",
      });
      if (res.status === 401) {
        setCurrentUser(null);
        setDepartments([]);
        setAllPermissions([]);
        setAiConfig(null);
        setRoleContext({});
        return;
      }
      const data = await res.json();
      if (res.ok && data.currentUser) {
        setCurrentUser(data.currentUser);
        setDepartments(data.departments || []);
        setAllPermissions(data.allPermissions || []);
        setAiConfig(data.aiConfig || null);
        setRoleContext(data.roleContext || {});
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const changeTab = useCallback((nextTab: string) => {
    const safeTab = VALID_TABS.has(nextTab) ? nextTab : "overview";
    setActiveTab(safeTab);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, safeTab);
      const url = new URL(window.location.href);
      url.searchParams.set("tab", safeTab);
      window.history.replaceState(null, "", `${url.pathname}${url.search}`);
    }
  }, []);

  const selectDepartment = useCallback((deptId: string | null) => {
    setSelectedDeptId(deptId);
    if (typeof window !== "undefined") {
      if (deptId) {
        window.localStorage.setItem(SELECTED_DEPT_STORAGE_KEY, deptId);
      } else {
        window.localStorage.removeItem(SELECTED_DEPT_STORAGE_KEY);
      }
    }
  }, []);

  const selectPatient = useCallback((patientId: string | null) => {
    setSelectedPatientId(patientId);
    if (typeof window !== "undefined") {
      if (patientId) {
        window.localStorage.setItem(SELECTED_PATIENT_STORAGE_KEY, patientId);
      } else {
        window.localStorage.removeItem(SELECTED_PATIENT_STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    const syncFromClient = () => {
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get("tab");
      const hashTab = window.location.hash.replace(/^#/, "");
      const storedTab = window.localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
      const candidate = [urlTab, hashTab, storedTab].find(
        (t): t is string => Boolean(t && VALID_TABS.has(t))
      );
      if (candidate) {
        changeTab(candidate);
      }

      const storedDept = window.localStorage.getItem(SELECTED_DEPT_STORAGE_KEY);
      if (storedDept) setSelectedDeptId(storedDept);
      const storedPatient = window.localStorage.getItem(
        SELECTED_PATIENT_STORAGE_KEY
      );
      if (storedPatient) setSelectedPatientId(storedPatient);
    };

    syncFromClient();
    window.addEventListener("popstate", syncFromClient);
    return () => window.removeEventListener("popstate", syncFromClient);
  }, [changeTab]);

  useEffect(() => {
    loadBootstrap();
  }, [loadBootstrap]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setSubmittingLogin(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || "Email ou mot de passe incorrect");
        return;
      }
      setLoginPassword("");
      selectPatient(null);
      selectDepartment(null);
      changeTab("overview");
      await loadBootstrap();
      showToast(`Bienvenue, ${data.user.fullName}`, "success");
    } finally {
      setSubmittingLogin(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    setCurrentUser(null);
    setDepartments([]);
    setAllPermissions([]);
    setAiConfig(null);
    setRoleContext({});
    setShowAiDrawer(false);
    setShowPermInspector(false);
    selectPatient(null);
    selectDepartment(null);
    changeTab("overview");
    setLoginEmail("");
    setLoginPassword("");
    setLoginError(null);
    showToast("Session fermée avec succès", "success");
  };

  const perms = new Set(currentUser?.effectivePermissions || []);

  const navItems = [
    {
      id: "overview",
      label: "Vue Globale",
      icon: LayoutDashboard,
      visible: true,
    },
    {
      id: "departments",
      label: "Les 8 Départements",
      icon: Building2,
      visible: perms.has("departments.view"),
    },
    {
      id: "communications",
      label: "Inter-Services & Transferts",
      icon: ArrowRightLeft,
      visible:
        perms.has("departments.communicate") || perms.has("departments.transfer"),
    },
    {
      id: "folders",
      label:
        currentUser?.profileType === "PATIENT"
          ? "Mon Dossier Médical"
          : "Dossiers Médicaux",
      icon: FolderHeart,
      visible: perms.has("folder.view_all") || perms.has("folder.view_own"),
    },
    {
      id: "profiles",
      label: perms.has("profiles.view_directory")
        ? "Profils Hospitaliers"
        : "Mon Profil",
      icon: Users,
      visible: true,
    },
    {
      id: "billing",
      label:
        currentUser?.profileType === "PATIENT"
          ? "Mes Factures"
          : "Finances & Facturation",
      icon: Receipt,
      visible: perms.has("billing.view_all") || perms.has("billing.view_own"),
    },
    {
      id: "rbac",
      label: "Rôles & Permissions (RBAC)",
      icon: ShieldCheck,
      visible: perms.has("rbac.manage"),
    },
    {
      id: "ai-settings",
      label: "Paramètres IA & Modèles",
      icon: Bot,
      visible: perms.has("ai.manage"),
    },
  ];

  useEffect(() => {
    if (!currentUser) return;
    const activeItem = navItems.find((i) => i.id === activeTab);
    if (!activeItem || !activeItem.visible) {
      changeTab("overview");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentUser?.effectivePermissions.length, activeTab, changeTab]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-sky-600 text-white shadow-lg">
            <Hospital className="h-8 w-8" />
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-700">
            Vérification de la session E-HOSPIA...
          </p>
        </div>
      </div>
    );
  }

  // ==================== AUTHENTICATION SCREEN ====================
  if (!currentUser) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 p-4">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white p-8 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-md">
              <Hospital className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
                E-HOSPIA
              </h1>
              <p className="text-xs font-medium text-sky-700">
                Portail Hospitalier Sécurisé & RBAC
              </p>
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-lg font-bold text-slate-900">
              Authentification requise
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Connectez-vous avec votre email et votre mot de passe personnel pour
              accéder à votre espace hospitalier selon vos rôles.
            </p>
          </div>

          {loginError && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Adresse email
              </label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="nom@e-hospia.fr"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Mot de passe
              </label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  required
                  type="password"
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingLogin}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-60"
            >
              <LogIn className="h-4 w-4" />
              {submittingLogin ? "Connexion en cours..." : "Se connecter"}
            </button>
          </form>

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-[11px] leading-relaxed text-slate-600">
            <strong className="text-slate-800">Accès par profil :</strong>{" "}
            Administration, Médecins, Infirmiers, Finances et Patients disposent
            chacun d&apos;identifiants dédiés documentés dans le fichier{" "}
            <code className="font-mono font-semibold text-sky-700">
              README.md
            </code>
            .
          </div>
        </div>

        {toast && (
          <div
            className={`fixed bottom-5 right-5 z-50 rounded-xl px-4 py-3 text-xs font-semibold text-white shadow-xl ${
              toast.type === "error" ? "bg-red-600" : "bg-slate-900"
            }`}
          >
            {toast.message}
          </div>
        )}
      </div>
    );
  }

  // ==================== AUTHENTICATED APPLICATION ====================
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="hidden w-72 shrink-0 flex-col border-r border-slate-200 bg-slate-900 text-slate-100 lg:flex">
        <div className="flex items-center gap-3 border-b border-slate-800 px-6 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500 text-white shadow-md">
            <Hospital className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-white">
              E-HOSPIA
            </h1>
            <p className="text-[11px] font-medium text-sky-300">
              Coordination Hospitalière
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navItems
            .filter((item) => item.visible)
            .map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => changeTab(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition ${
                    isActive
                      ? "bg-sky-600 text-white shadow-sm"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
        </nav>

        {/* Role-aware mini status in sidebar */}
        <div className="border-t border-slate-800 p-4">
          {perms.has("departments.view") ? (
            <div className="rounded-xl bg-slate-800/70 p-3.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-emerald-400" />8 Services actifs
                </span>
                <span className="text-[10px] text-emerald-400">En ligne</span>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
                Urgences • Déchocage • Réa • Psychiatrie • Pédiatrie • Gynéco •
                Maternité • Néonat
              </p>
            </div>
          ) : currentUser.profileType === "PATIENT" ? (
            <div className="rounded-xl bg-slate-800/70 p-3.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  Espace Patient Confidentiel
                </span>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
                Accès chiffré limité à votre profil médical, vos médecins et vos
                factures.
              </p>
            </div>
          ) : currentUser.profileType === "FINANCIAL" ? (
            <div className="rounded-xl bg-slate-800/70 p-3.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <Receipt className="h-3.5 w-3.5 text-emerald-400" />
                  Direction Financière
                </span>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
                Facturation hospitalière, mutuelles et suivi des encaissements.
              </p>
            </div>
          ) : (
            <div className="rounded-xl bg-slate-800/70 p-3.5">
              <p className="text-xs font-semibold text-slate-300">
                Espace Utilisateur E-HOSPIA
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Mobile Brand + Active Tab Label */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-600 text-white lg:hidden">
                <Hospital className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {navItems.find((i) => i.id === activeTab)?.label}
                </h2>
                <p className="hidden text-xs text-slate-500 sm:block">
                  Système hospitalier multi-services & contrôle d&apos;accès RBAC
                </p>
              </div>
            </div>

            {/* Right: AI Assistant + Permissions Inspector + Authenticated User + Logout */}
            <div className="flex items-center gap-2.5">
              {perms.has("ai.use") && (
                <button
                  onClick={() => {
                    setShowAiDrawer(true);
                    setShowPermInspector(false);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Assistant IA</span>
                  {aiConfig?.activeModel && (
                    <span className="hidden rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-medium xl:inline">
                      {aiConfig.activeModel.name}
                    </span>
                  )}
                </button>
              )}

              {/* Active Permissions Pill */}
              <div className="relative">
                <button
                  onClick={() => setShowPermInspector(!showPermInspector)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <KeyRound className="h-3.5 w-3.5 text-sky-600" />
                  <span className="hidden sm:inline">Permissions :</span>
                  <span className="font-bold text-sky-700">
                    {currentUser.effectivePermissions.length}/
                    {allPermissions.length}
                  </span>
                </button>

                {showPermInspector && (
                  <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold text-slate-900">
                        Permissions effectives de {currentUser.fullName}
                      </span>
                      <button
                        onClick={() => setShowPermInspector(false)}
                        className="text-slate-400 hover:text-slate-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">
                      Rôles :{" "}
                      <strong className="text-slate-800">
                        {currentUser.roleNames.join(" + ")}
                      </strong>
                    </p>
                    <div className="mt-2.5 flex max-h-60 flex-wrap gap-1 overflow-y-auto">
                      {allPermissions.map((p) => {
                        const has = perms.has(p.code);
                        return (
                          <span
                            key={p.id}
                            className={`rounded px-2 py-0.5 font-mono text-[10px] ${
                              has
                                ? "bg-emerald-50 font-semibold text-emerald-700 ring-1 ring-emerald-200"
                                : "bg-slate-50 text-slate-400 line-through"
                            }`}
                          >
                            {p.code}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Authenticated User Badge */}
              <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white"
                  style={{ backgroundColor: currentUser.avatarColor }}
                >
                  {currentUser.fullName
                    .replace("Dr. ", "")
                    .replace("Inf. ", "")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="hidden text-left md:block">
                  <p className="text-xs font-bold text-slate-900">
                    {currentUser.fullName}
                  </p>
                  <p className="text-[10px] font-semibold text-sky-700">
                    <span
                      className={`mr-1 rounded px-1 py-0.5 text-[9px] font-bold ${
                        PROFILE_TYPE_BADGES[currentUser.profileType] || ""
                      }`}
                    >
                      {PROFILE_TYPE_LABELS[currentUser.profileType]}
                    </span>
                    {currentUser.roleNames[0]}
                    {currentUser.roleNames.length > 1
                      ? ` +${currentUser.roleNames.length - 1}`
                      : ""}
                  </p>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                title="Se déconnecter"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            </div>
          </div>

          {/* Mobile Tab Strip */}
          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 lg:hidden">
            {navItems
              .filter((item) => item.visible)
              .map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => changeTab(item.id)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                      isActive
                        ? "bg-sky-600 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </button>
                );
              })}
          </div>
        </header>

        {/* Active Tab Viewport */}
        <main className="mx-auto w-full max-w-[1440px] flex-1 p-4 sm:p-6">
          {activeTab === "overview" && (
            <OverviewTab
              currentUser={currentUser}
              departments={departments}
              roleContext={roleContext}
              onNavigateTab={(tab) => changeTab(tab)}
              onSelectDepartment={(deptId) => selectDepartment(deptId)}
            />
          )}

          {activeTab === "departments" && (
            <DepartmentsTab
              currentUser={currentUser}
              selectedDepartmentId={selectedDeptId}
              onSelectDepartment={(deptId) => selectDepartment(deptId)}
              onOpenPatientFolder={(patientId) => {
                selectPatient(patientId);
                changeTab("folders");
              }}
              onToast={showToast}
              onRefreshBootstrap={loadBootstrap}
            />
          )}

          {activeTab === "communications" && (
            <CommunicationsTab
              currentUser={currentUser}
              departments={departments}
              onToast={showToast}
              onRefreshBootstrap={loadBootstrap}
            />
          )}

          {activeTab === "folders" && (
            <MedicalFoldersTab
              currentUser={currentUser}
              departments={departments}
              initialPatientId={selectedPatientId}
              onToast={showToast}
              onRefreshBootstrap={loadBootstrap}
            />
          )}

          {activeTab === "profiles" && (
            <ProfilesTab
              currentUser={currentUser}
              departments={departments}
              onOpenPatientFolder={(patientId) => {
                selectPatient(patientId);
                changeTab("folders");
              }}
              onToast={showToast}
              onRefreshBootstrap={loadBootstrap}
            />
          )}

          {activeTab === "billing" && (
            <BillingTab
              currentUser={currentUser}
              departments={departments}
              onToast={showToast}
            />
          )}

          {activeTab === "rbac" && (
            <RbacTab
              currentUser={currentUser}
              onToast={showToast}
              onRefreshBootstrap={loadBootstrap}
            />
          )}

          {activeTab === "ai-settings" && (
            <AiSettingsTab
              currentUser={currentUser}
              onToast={showToast}
              onRefreshBootstrap={loadBootstrap}
            />
          )}
        </main>
      </div>

      <AiAssistantDrawer
        isOpen={showAiDrawer}
        onClose={() => setShowAiDrawer(false)}
        currentUser={currentUser}
        aiConfig={aiConfig}
        onOpenAiSettings={() => changeTab("ai-settings")}
      />

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 rounded-xl px-4 py-3 text-xs font-semibold text-white shadow-xl ${
            toast.type === "error" ? "bg-red-600" : "bg-slate-900"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
