"use client";

import React, { useEffect, useState } from "react";
import {
  Bot,
  CheckCircle2,
  Cpu,
  KeyRound,
  Plus,
  Save,
  Sliders,
  Sparkles,
  Trash2,
} from "lucide-react";
import { AiModelConfig, AiPublicConfig, AuthUser } from "@/types/ehospia";

interface AiSettingsTabProps {
  currentUser: AuthUser;
  onToast: (msg: string, type?: "success" | "error") => void;
  onRefreshBootstrap: () => void;
}

const PROVIDER_LABELS: Record<string, string> = {
  LOCAL_DEMO: "Moteur Démo Local (JSON)",
  GOOGLE_GEMINI: "Google Gemini API",
  OPENAI_COMPATIBLE: "OpenAI / Compatible",
  ANTHROPIC: "Anthropic Claude",
  MISTRAL: "Mistral AI",
  OLLAMA_LOCAL: "Ollama On-Premise (Local)",
};

export default function AiSettingsTab({
  currentUser,
  onToast,
  onRefreshBootstrap,
}: AiSettingsTabProps) {
  const [aiConfig, setAiConfig] = useState<AiPublicConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // Add model form
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("GOOGLE_GEMINI");
  const [modelId, setModelId] = useState("");
  const [endpoint, setEndpoint] = useState(
    "https://generativelanguage.googleapis.com/v1beta"
  );
  const [apiKey, setApiKey] = useState("");
  const [description, setDescription] = useState("");
  const [setAsActive, setSetAsActive] = useState(true);

  // Global settings
  const [systemPrompt, setSystemPrompt] = useState("");
  const [temperature, setTemperature] = useState(0.2);

  // Per-model key editing
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
  const [editKeyValue, setEditKeyValue] = useState("");
  const [editEndpointValue, setEditEndpointValue] = useState("");
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);

  const canManageAi = currentUser.effectivePermissions.includes("ai.manage");

  const loadAiConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai", {
        headers: { "x-user-id": currentUser.id },
      });
      if (res.ok) {
        const data = await res.json();
        setAiConfig(data.aiConfig);
        setSystemPrompt(data.aiConfig?.hospitalSystemPrompt || "");
        setTemperature(data.aiConfig?.temperature ?? 0.2);
      }
      try {
        const olRes = await fetch("http://localhost:11434/api/tags");
        if (olRes.ok) {
          const olData = await olRes.json();
          setOllamaModels(
            (olData.models || []).map((m: { name: string }) => m.name)
          );
        }
      } catch {
        setOllamaModels([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAiConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.id]);

  const handleProviderChange = (nextProvider: string) => {
    setProvider(nextProvider);
    if (nextProvider === "GOOGLE_GEMINI") {
      setEndpoint("https://generativelanguage.googleapis.com/v1beta");
    } else if (nextProvider === "OPENAI_COMPATIBLE") {
      setEndpoint("https://api.openai.com/v1");
    } else if (nextProvider === "MISTRAL") {
      setEndpoint("https://api.mistral.ai/v1");
    } else if (nextProvider === "ANTHROPIC") {
      setEndpoint("https://api.anthropic.com/v1");
    } else if (nextProvider === "OLLAMA_LOCAL") {
      setEndpoint("http://localhost:11434/v1");
    } else {
      setEndpoint("local://ehospia-json-engine");
    }
  };

  const handleAddModel = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": currentUser.id,
      },
      body: JSON.stringify({
        action: "add_model",
        name,
        provider,
        modelId,
        endpoint,
        apiKey,
        description,
        setAsActive,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      onToast(data.error || "Erreur lors de l'ajout du modèle", "error");
      return;
    }
    setAiConfig(data.aiConfig);
    setName("");
    setModelId("");
    setApiKey("");
    setDescription("");
    onToast(
      setAsActive
        ? `Modèle "${data.model.name}" ajouté et activé pour tout l'hôpital`
        : `Modèle "${data.model.name}" ajouté au catalogue`,
      "success"
    );
    onRefreshBootstrap();
  };

  const handleActivateModel = async (targetId: string, modelName: string) => {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": currentUser.id,
      },
      body: JSON.stringify({
        action: "set_active_model",
        modelId: targetId,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      onToast(data.error || "Accès refusé", "error");
      return;
    }
    setAiConfig(data.aiConfig);
    onToast(
      `"${modelName}" est désormais le modèle actif pour tous les utilisateurs`,
      "success"
    );
    onRefreshBootstrap();
  };

  const handleDeleteModel = async (targetId: string) => {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": currentUser.id,
      },
      body: JSON.stringify({
        action: "delete_model",
        modelId: targetId,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      onToast(data.error || "Suppression impossible", "error");
      return;
    }
    setAiConfig(data.aiConfig);
    onToast("Modèle supprimé du catalogue", "success");
    onRefreshBootstrap();
  };

  const handleSaveGlobalSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": currentUser.id,
      },
      body: JSON.stringify({
        action: "update_settings",
        hospitalSystemPrompt: systemPrompt,
        temperature,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      onToast(data.error || "Erreur de sauvegarde", "error");
      return;
    }
    setAiConfig(data.aiConfig);
    onToast("Paramètres globaux IA enregistrés", "success");
    onRefreshBootstrap();
  };

  const handleSaveModelCredentials = async (targetId: string) => {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": currentUser.id,
      },
      body: JSON.stringify({
        action: "update_settings",
        targetModelId: targetId,
        apiKey: editKeyValue,
        endpoint: editEndpointValue,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setAiConfig(data.aiConfig);
      setEditingKeyId(null);
      onToast("Configuration du modèle mise à jour", "success");
    }
  };

  if (!canManageAi) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Accès refusé : la configuration des modèles IA est réservée à
        l&apos;Administration (permission <code>ai.manage</code>).
      </div>
    );
  }

  if (loading || !aiConfig) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
        Chargement de la configuration IA...
      </div>
    );
  }

  const models: AiModelConfig[] = aiConfig.models || [];
  const activeModel = aiConfig.activeModel;

  return (
    <div className="space-y-6">
      {/* Active Global Model Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-900 to-sky-950 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-200 ring-1 ring-indigo-400/30">
              <Sparkles className="h-3.5 w-3.5" />
              Gouvernance IA Hospitalière (Administration)
            </span>
            <h2 className="text-xl font-bold">
              Modèle IA actif pour tout l&apos;hôpital :{" "}
              <span className="text-sky-300">
                {activeModel?.name || "Aucun"}
              </span>
            </h2>
            <p className="text-xs text-slate-300">
              Tous les médecins, infirmiers, financiers et patients utilisent
              automatiquement ce modèle lorsqu&apos;ils interrogent l&apos;Assistant IA
              E-HOSPIA, dans le respect strict de leurs permissions RBAC.
            </p>
          </div>

          {activeModel && (
            <div className="rounded-xl bg-white/10 px-4 py-3 text-xs ring-1 ring-white/20">
              <p className="font-mono font-bold text-sky-200">
                {activeModel.modelId}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-300">
                {PROVIDER_LABELS[activeModel.provider] || activeModel.provider}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left 7 cols: Model Catalog */}
        <div className="space-y-4 lg:col-span-7">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <Cpu className="h-4 w-4 text-indigo-600" />
                  Catalogue des Modèles IA ({models.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Sélectionnez le modèle qui servira par défaut à l&apos;ensemble des
                  utilisateurs.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {models.map((m) => {
                const isActive = activeModel?.id === m.id;
                const isEditing = editingKeyId === m.id;

                return (
                  <div
                    key={m.id}
                    className={`rounded-xl border p-4 transition ${
                      isActive
                        ? "border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-500/20"
                        : "border-slate-200 bg-slate-50/50 hover:bg-white"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">
                            {m.name}
                          </h4>
                          <span className="rounded bg-slate-200/80 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-800">
                            {m.modelId}
                          </span>
                          <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200">
                            {PROVIDER_LABELS[m.provider] || m.provider}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">{m.description}</p>
                        <p className="font-mono text-[10px] text-slate-400">
                          Endpoint : {m.endpoint} • Ajouté par {m.addedBy}
                          {m.provider === "OLLAMA_LOCAL"
                            ? " • Ollama Local Live (sans clé API) ✓"
                            : m.apiKey
                              ? " • Clé API configurée ✓"
                              : " • Mode démo local"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Actif globalement
                          </span>
                        ) : (
                          <button
                            onClick={() => handleActivateModel(m.id, m.name)}
                            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                          >
                            Activer pour tous
                          </button>
                        )}
                        {m.provider !== "LOCAL_DEMO" && (
                          <button
                            onClick={() => {
                              if (isEditing) {
                                setEditingKeyId(null);
                              } else {
                                setEditingKeyId(m.id);
                                setEditKeyValue(m.apiKey || "");
                                setEditEndpointValue(m.endpoint || "");
                              }
                            }}
                            title="Configurer clé API / endpoint"
                            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {models.length > 1 && (
                          <button
                            onClick={() => handleDeleteModel(m.id)}
                            title="Supprimer le modèle"
                            className="rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-600 hover:bg-red-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {isEditing && (
                      <div className="mt-3 grid grid-cols-1 gap-2 border-t border-slate-200 pt-3 sm:grid-cols-2">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500">
                            Endpoint URL
                          </label>
                          <input
                            value={editEndpointValue}
                            onChange={(e) => setEditEndpointValue(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500">
                            Clé API (optionnelle pour démo)
                          </label>
                          <div className="mt-1 flex gap-1.5">
                            <input
                              type="password"
                              value={editKeyValue}
                              onChange={(e) => setEditKeyValue(e.target.value)}
                              placeholder="sk-... ou AIza..."
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveModelCredentials(m.id)}
                              className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                            >
                              OK
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Global System Prompt & Temperature */}
          <form
            onSubmit={handleSaveGlobalSettings}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Sliders className="h-4 w-4 text-sky-600" />
              Paramètres Globaux & Consignes Hospitalières
            </h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  System Prompt partagé (appliqué à tous les rôles)
                </label>
                <textarea
                  rows={3}
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold text-slate-700">
                    Température : <strong>{temperature}</strong>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={temperature}
                    onChange={(e) => setTemperature(Number(e.target.value))}
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  <Save className="h-3.5 w-3.5" />
                  Enregistrer les réglages
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Right 5 cols: Add New AI Model Form */}
        <div className="lg:col-span-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Plus className="h-4 w-4 text-indigo-600" />
              Ajouter un nouveau modèle IA
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Enregistrez n&apos;importe quel modèle (Gemini, GPT, Claude, Mistral,
              DeepSeek, Ollama) dans <code>ehospia-data.json</code> et rendez-le
              actif pour l&apos;hôpital.
            </p>

            {ollamaModels.length > 0 && (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
                <p className="text-[11px] font-bold text-emerald-800">
                  Modèles Ollama détectés sur votre PC ({ollamaModels.length}) :
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {ollamaModels.map((om) => (
                    <button
                      key={om}
                      type="button"
                      onClick={() => {
                        setProvider("OLLAMA_LOCAL");
                        setEndpoint("http://localhost:11434/v1");
                        setModelId(om);
                        if (!name.trim()) setName(`Ollama ${om}`);
                        if (!description.trim())
                          setDescription(
                            `Modèle local Ollama (${om}) sur http://localhost:11434`
                          );
                      }}
                      className="rounded-lg bg-white px-2.5 py-1 font-mono text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-300 hover:bg-emerald-100"
                    >
                      + {om}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleAddModel} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Nom d&apos;affichage du modèle *
                </label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Mistral Large Hospital / DeepSeek-R1"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Fournisseur *
                  </label>
                  <select
                    value={provider}
                    onChange={(e) => handleProviderChange(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-2.5 py-2 text-xs font-semibold"
                  >
                    <option value="GOOGLE_GEMINI">Google Gemini</option>
                    <option value="OPENAI_COMPATIBLE">OpenAI / Compatible</option>
                    <option value="MISTRAL">Mistral AI</option>
                    <option value="ANTHROPIC">Anthropic Claude</option>
                    <option value="OLLAMA_LOCAL">Ollama Local</option>
                    <option value="LOCAL_DEMO">Moteur Démo JSON</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Identifiant technique *
                  </label>
                  <input
                    required
                    value={modelId}
                    onChange={(e) => setModelId(e.target.value)}
                    placeholder="Ex: gemini-2.5-pro"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Endpoint API
                </label>
                <input
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Clé API (optionnelle en mode démo)
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Laisser vide pour simulation JSON locale"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Description / Usage clinique
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Modèle dédié aux synthèses multi-services..."
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-50/70 p-3 text-xs font-semibold text-indigo-900">
                <input
                  type="checkbox"
                  checked={setAsActive}
                  onChange={(e) => setSetAsActive(e.target.checked)}
                />
                Définir immédiatement comme modèle actif pour tout l&apos;hôpital
              </label>

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                <Bot className="h-4 w-4" />
                Ajouter le modèle à E-HOSPIA
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
