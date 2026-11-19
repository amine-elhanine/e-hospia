"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Activity,
  ArrowRightLeft,
  Bot,
  Building2,
  ChevronDown,
  Download,
  ExternalLink,
  FileJson,
  FolderHeart,
  Hospital,
  KeyRound,
  LayoutDashboard,
  LogIn,
  Receipt,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import {
  demoFetch,
  downloadDemoJsonData,
  resetDemoJsonData,
} from "@/lib/demoStore";
import {
  AiPublicConfig,
  AuthUser,
  DepartmentSummary,
  PROFILE_TYPE_BADGES,
  PROFILE_TYPE_LABELS,
  PermissionItem,
  RoleContext,
  UserSwitchOption,
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

export default function EHospiaApp() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [allUsers, setAllUsers] = useState<UserSwitchOption[]>([]);
  const [departments, setDepartments] = useState<DepartmentSummary[]>([]);
  const [allPermissions, setAllPermissions] = useState<PermissionItem[]>([]);
  const [roleContext, setRoleContext] = useState<RoleContext>({});
  const [aiConfig, setAiConfig] = useState<AiPublicConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<string>("overview");
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const [showSwitcher, setShowSwitcher] = useState(false);
  const [showPermInspector, setShowPermInspector] = useState(false);
  const [showJsonMenu, setShowJsonMenu] = useState(false);
  const [showAiDrawer, setShowAiDrawer] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("demo");

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

  const loadBootstrap = useCallback(async (overrideUserId?: string) => {
    try {
      const storedId =
        overrideUserId ||
        (typeof window !== "undefined"
          ? window.localStorage.getItem("ehospia_user_id")
          : null);

      const res = await demoFetch("/api/bootstrap", {
        headers: storedId ? { "x-user-id": storedId } : undefined,
      });
      const data = await res.json();
      if (res.ok && data.currentUser) {
        setCurrentUser(data.currentUser);
        setAllUsers(data.allUsers || []);
        setDepartments(data.departments || []);
        setAllPermissions(data.allPermissions || []);
        setAiConfig(data.aiConfig || null);
        setRoleContext(data.roleContext || {});
        if (typeof window !== "undefined") {
          window.localStorage.setItem("ehospia_user_id", data.currentUser.id);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBootstrap();
  }, [loadBootstrap]);

  const handleSwitchUser = async (userId: string) => {
    setShowSwitcher(false);
    const res = await demoFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json();
    if (res.ok && data.user) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("ehospia_user_id", data.user.id);
      }
      setCurrentUser(data.user);
      setSelectedPatientId(null);
      await loadBootstrap(data.user.id);
      showToast(
        `Connecté en tant que ${data.user.fullName} (${
          PROFILE_TYPE_LABELS[data.user.profileType] || data.user.profileType
        })`,
        "success"
      );
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await demoFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: loginEmail, password: loginPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Identifiants invalides", "error");
      return;
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem("ehospia_user_id", data.user.id);
    }
    setShowLoginModal(false);
    setCurrentUser(data.user);
    await loadBootstrap(data.user.id);
    showToast(`Bienvenue ${data.user.fullName}`, "success");
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
      label:
        perms.has("profiles.view_directory")
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

  // Auto-fallback to overview if current tab becomes hidden after switching roles
  useEffect(() => {
    const activeItem = navItems.find((i) => i.id === activeTab);
    if (activeItem && !activeItem.visible) {
      setActiveTab("overview");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentUser?.effectivePermissions.length]);

  if (loading || !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-sky-600 text-white shadow-lg">
            <Hospital className="h-8 w-8" />
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-700">
            Initialisation de la plateforme E-HOSPIA...
          </p>
        </div>
      </div>
    );
  }

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
                  onClick={() => setActiveTab(item.id)}
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
                Urgences • Déchocage • Réa • Psychiatrie • Pédiatrie • Gynéco • Maternité • Néonat
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
                Accès chiffré limité à votre profil médical, vos médecins et vos factures.
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

            {/* Right: AI Assistant + JSON Source Menu + Permissions Inspector + User Switcher */}
            <div className="flex items-center gap-2.5">
              {perms.has("ai.use") && (
                <button
                  onClick={() => {
                    setShowAiDrawer(true);
                    setShowJsonMenu(false);
                    setShowPermInspector(false);
                    setShowSwitcher(false);
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

              {/* Demo JSON Data Menu */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowJsonMenu(!showJsonMenu);
                    setShowPermInspector(false);
                    setShowSwitcher(false);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                >
                  <FileJson className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="hidden md:inline">ehospia-data.json</span>
                  <ChevronDown className="h-3.5 w-3.5 text-emerald-600" />
                </button>

                {showJsonMenu && (
                  <div className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                    <div className="border-b border-slate-100 pb-2">
                      <p className="text-xs font-bold text-slate-900">
                        Mode Démo JSON (Sans BDD / Backend)
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        Données chargées depuis <code>ehospia-data.json</code> et persistées localement.
                      </p>
                    </div>
                    <div className="mt-2 space-y-1">
                      <a
                        href="/ehospia-data.json"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setShowJsonMenu(false)}
                        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-sky-600" />
                        Voir le fichier JSON source
                      </a>
                      <button
                        onClick={() => {
                          downloadDemoJsonData();
                          setShowJsonMenu(false);
                          showToast("Fichier ehospia-data.json téléchargé", "success");
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Download className="h-3.5 w-3.5 text-emerald-600" />
                        Télécharger l&apos;état JSON actuel
                      </button>
                      <button
                        onClick={async () => {
                          resetDemoJsonData();
                          setShowJsonMenu(false);
                          await loadBootstrap(currentUser.id);
                          showToast(
                            "Données réinitialisées depuis ehospia-data.json",
                            "success"
                          );
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-semibold text-amber-700 hover:bg-amber-50"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Réinitialiser le JSON démo
                      </button>
                    </div>
                  </div>
                )}
              </div>

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
                  <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl z-50">
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

              {/* Account Switcher Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowSwitcher(!showSwitcher)}
                  className="inline-flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-left shadow-sm transition hover:border-sky-300"
                >
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
                      {PROFILE_TYPE_LABELS[currentUser.profileType]} •{" "}
                      {currentUser.roleNames[0]}
                      {currentUser.roleNames.length > 1
                        ? ` +${currentUser.roleNames.length - 1}`
                        : ""}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>

                {showSwitcher && (
                  <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl z-50">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold text-slate-900">
                        Tester un profil / Changer de compte
                      </span>
                      <button
                        onClick={() => {
                          setShowSwitcher(false);
                          setShowLoginModal(true);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 hover:text-sky-700"
                      >
                        <LogIn className="h-3 w-3" />
                        Connexion email
                      </button>
                    </div>
                    <div className="mt-2 max-h-96 space-y-1 overflow-y-auto">
                      {allUsers.map((u) => {
                        const active = u.id === currentUser.id;
                        return (
                          <button
                            key={u.id}
                            onClick={() => handleSwitchUser(u.id)}
                            className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left transition ${
                              active
                                ? "bg-sky-50 ring-1 ring-sky-200"
                                : "hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white"
                                style={{ backgroundColor: u.avatarColor }}
                              >
                                {u.fullName
                                  .replace("Dr. ", "")
                                  .replace("Inf. ", "")
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-900">
                                  {u.fullName}
                                </p>
                                <p className="text-[10px] text-slate-500">
                                  {u.roles.map((r) => r.name).join(" + ")}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${
                                PROFILE_TYPE_BADGES[u.profileType] || ""
                              }`}
                            >
                              {PROFILE_TYPE_LABELS[u.profileType]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
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
                    onClick={() => setActiveTab(item.id)}
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
              onNavigateTab={(tab) => setActiveTab(tab)}
              onSelectDepartment={(deptId) => setSelectedDeptId(deptId)}
            />
          )}

          {activeTab === "departments" && (
            <DepartmentsTab
              currentUser={currentUser}
              selectedDepartmentId={selectedDeptId}
              onSelectDepartment={(deptId) => setSelectedDeptId(deptId)}
              onOpenPatientFolder={(patientId) => {
                setSelectedPatientId(patientId);
                setActiveTab("folders");
              }}
              onToast={showToast}
              onRefreshBootstrap={() => loadBootstrap(currentUser.id)}
            />
          )}

          {activeTab === "communications" && (
            <CommunicationsTab
              currentUser={currentUser}
              departments={departments}
              onToast={showToast}
              onRefreshBootstrap={() => loadBootstrap(currentUser.id)}
            />
          )}

          {activeTab === "folders" && (
            <MedicalFoldersTab
              currentUser={currentUser}
              departments={departments}
              initialPatientId={selectedPatientId}
              onToast={showToast}
              onRefreshBootstrap={() => loadBootstrap(currentUser.id)}
            />
          )}

          {activeTab === "profiles" && (
            <ProfilesTab
              currentUser={currentUser}
              departments={departments}
              onOpenPatientFolder={(patientId) => {
                setSelectedPatientId(patientId);
                setActiveTab("folders");
              }}
              onToast={showToast}
              onRefreshBootstrap={() => loadBootstrap(currentUser.id)}
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
              onRefreshBootstrap={() => loadBootstrap(currentUser.id)}
            />
          )}

          {activeTab === "ai-settings" && (
            <AiSettingsTab
              currentUser={currentUser}
              onToast={showToast}
              onRefreshBootstrap={() => loadBootstrap(currentUser.id)}
            />
          )}
        </main>
      </div>

      <AiAssistantDrawer
        isOpen={showAiDrawer}
        onClose={() => setShowAiDrawer(false)}
        currentUser={currentUser}
        aiConfig={aiConfig}
        onOpenAiSettings={() => setActiveTab("ai-settings")}
      />

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Connexion E-HOSPIA
              </h3>
              <button
                onClick={() => setShowLoginModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Mot de passe démo pour tous les comptes : <code>demo</code>
            </p>
            <form onSubmit={handleEmailLogin} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Email professionnel ou patient
                </label>
                <input
                  required
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="dr.mansouri@e-hospia.fr"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Mot de passe
                </label>
                <input
                  required
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
              >
                Se connecter
              </button>
            </form>
          </div>
        </div>
      )}

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
