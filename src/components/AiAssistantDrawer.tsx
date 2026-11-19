"use client";

import React, { useEffect, useState } from "react";
import {
  Bot,
  Cpu,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { AiPublicConfig, AuthUser, PROFILE_TYPE_LABELS } from "@/types/ehospia";
import { demoFetch } from "@/lib/demoStore";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  modelName?: string;
  modelId?: string;
  mode?: string;
}

interface AiAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser;
  aiConfig: AiPublicConfig | null;
  onOpenAiSettings?: () => void;
}

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`)/g);
  return tokens.map((token, idx) => {
    if (token.startsWith("**") && token.endsWith("**") && token.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-slate-900">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith("*") && token.endsWith("*") && token.length > 2) {
      return (
        <em key={idx} className="italic text-slate-700">
          {token.slice(1, -1)}
        </em>
      );
    }
    if (token.startsWith("`") && token.endsWith("`") && token.length > 2) {
      return (
        <code
          key={idx}
          className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-indigo-700"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={idx}>{token}</React.Fragment>;
  });
}

function MarkdownMessage({ content }: { content: string }) {
  const blocks: React.ReactNode[] = [];
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // Fenced code block
    if (trimmed.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push(
        <pre
          key={`code-${i}`}
          className="my-2 overflow-x-auto rounded-xl bg-slate-900 p-3 font-mono text-[11px] text-slate-100"
        >
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }

    // Heading (#, ##, ###, ####)
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      blocks.push(
        <h4
          key={`h-${i}`}
          className={`mt-2.5 mb-1 font-bold text-slate-900 ${
            level <= 2 ? "text-sm" : "text-xs"
          }`}
        >
          {renderInlineMarkdown(headingMatch[2])}
        </h4>
      );
      i++;
      continue;
    }

    // Unordered list (*, -, •)
    if (/^(\*|-|•)\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^(\*|-|•)\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^(\*|-|•)\s+/, ""));
        i++;
      }
      blocks.push(
        <ul key={`ul-${i}`} className="my-1.5 list-disc space-y-1 pl-4">
          {items.map((item, idx) => (
            <li key={idx}>{renderInlineMarkdown(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list (1., 2., ...)
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push(
        <ol key={`ol-${i}`} className="my-1.5 list-decimal space-y-1 pl-4">
          {items.map((item, idx) => (
            <li key={idx}>{renderInlineMarkdown(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Normal paragraph line(s)
    blocks.push(
      <p key={`p-${i}`} className="my-1 leading-relaxed">
        {renderInlineMarkdown(trimmed)}
      </p>
    );
    i++;
  }

  return <div className="space-y-0.5">{blocks}</div>;
}

export default function AiAssistantDrawer({
  isOpen,
  onClose,
  currentUser,
  aiConfig,
  onOpenAiSettings,
}: AiAssistantDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Reset conversation when switching user profile to preserve strict data isolation
  useEffect(() => {
    setMessages([]);
    setInput("");
  }, [currentUser.id]);

  if (!isOpen) return null;

  const perms = new Set(currentUser.effectivePermissions);
  const canManageAi = perms.has("ai.manage");
  const activeModel = aiConfig?.activeModel;

  const getSuggestedPrompts = () => {
    if (currentUser.profileType === "PATIENT") {
      return [
        "Résume mes cas médicaux et mes médecins traitants",
        "Quel est le reste à payer sur mes factures ?",
        "Combien de lits vides y a-t-il en Maternité ? (test RBAC)",
      ];
    }
    if (currentUser.profileType === "ADMIN") {
      return [
        "Combien de médecins avons-nous et dans quels services ?",
        "État des lits occupés et vides dans les 8 services",
        "Résume le diagnostic médical de Yasmine Alaoui (test secret médical)",
      ];
    }
    if (currentUser.profileType === "FINANCIAL") {
      return [
        "Analyse financière des factures et restes à charge",
        "Combien de lits sont vides aux Urgences ? (test RBAC)",
      ];
    }
    return [
      "Synthèse multi-cas de Mme. Yasmine Alaoui et allergies",
      "Quels sont les cas critiques et transferts en attente ?",
      "État des lits vides et services en alerte",
    ];
  };

  const sendPrompt = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text.trim(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await demoFetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id,
        },
        body: JSON.stringify({ action: "chat", prompt: text.trim() }),
      });
      const data = await res.json();
      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: res.ok
          ? data.reply
          : data.error || "Accès refusé par le contrôle RBAC.",
        modelName: data.modelUsed?.name || activeModel?.name,
        modelId: data.modelUsed?.modelId || activeModel?.modelId,
        mode: data.mode,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[1px]">
      <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
        {/* Header showing Active Model selected by Admin */}
        <div className="border-b border-slate-200 bg-gradient-to-r from-indigo-950 to-slate-900 px-5 py-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-sm">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Assistant IA E-HOSPIA</h3>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-sky-200">
                    <Cpu className="h-3 w-3" />
                    Modèle actif : {activeModel?.name || "Non configuré"}
                  </span>
                  {activeModel && (
                    <span className="font-mono text-[10px] text-slate-300">
                      ({activeModel.modelId})
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-1 text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-white/10 px-3 py-2 text-[11px]">
            <span className="inline-flex items-center gap-1.5 text-slate-200">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              Périmètre :{" "}
              <strong>
                {PROFILE_TYPE_LABELS[currentUser.profileType] ||
                  currentUser.profileType}
              </strong>{" "}
              (Santé & E-HOSPIA)
            </span>
            {canManageAi && onOpenAiSettings ? (
              <button
                onClick={() => {
                  onClose();
                  onOpenAiSettings();
                }}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-indigo-500 px-2 py-1 text-[10px] font-bold text-white hover:bg-indigo-400"
              >
                <Settings className="h-3 w-3" />
                Changer modèle
              </button>
            ) : (
              <span className="text-[10px] text-slate-300">
                Défini par l&apos;Admin
              </span>
            )}
          </div>
        </div>

        {/* Messages Body */}
        <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4">
          {messages.length === 0 ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
                <p className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                  Connecté au modèle global : {activeModel?.name}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                  {currentUser.profileType === "PATIENT"
                    ? "Je suis strictement limité à votre propre dossier médical, vos médecins traitants et vos factures."
                    : currentUser.profileType === "ADMIN"
                      ? "Je peux analyser les capacités en lits (occupés/vides) et les effectifs de l'hôpital (médecins, infirmiers), dans le respect du secret médical."
                      : currentUser.profileType === "FINANCIAL"
                        ? "Je peux résumer vos indicateurs financiers, mutuelles et factures en attente."
                        : "Je peux synthétiser les dossiers multi-cas, signaler les allergies critiques et analyser la disponibilité des lits et effectifs."}
                </p>
              </div>

              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Questions suggérées pour votre profil
                </p>
                <div className="space-y-2">
                  {getSuggestedPrompts().map((q) => (
                    <button
                      key={q}
                      onClick={() => sendPrompt(q)}
                      className="block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left text-xs font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50/40"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs shadow-sm ${
                    m.role === "user"
                      ? "bg-sky-600 text-white"
                      : "border border-slate-200 bg-white text-slate-800"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <MarkdownMessage content={m.content} />
                  ) : (
                    <div className="whitespace-pre-line leading-relaxed">
                      {m.content}
                    </div>
                  )}
                  {m.role === "assistant" && m.modelName && (
                    <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-1.5 text-[10px] text-slate-400">
                      <span>
                        Réponse par <strong>{m.modelName}</strong> ({m.modelId})
                      </span>
                      <span
                        className={
                          m.mode === "LIVE_API"
                            ? "rounded bg-emerald-50 px-1.5 py-0.5 font-bold text-emerald-700"
                            : ""
                        }
                      >
                        {m.mode === "LIVE_API" ? "LIVE API" : "Démo JSON"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
              Analyse par {activeModel?.name}...
            </div>
          )}
        </div>

        {/* Input Footer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendPrompt(input);
          }}
          className="border-t border-slate-200 bg-white p-3"
        >
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Poser une question à ${activeModel?.name || "l'IA"}...`}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs focus:border-indigo-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
