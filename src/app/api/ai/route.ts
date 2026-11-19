import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AuthUser,
  PERMISSIONS,
  forbiddenResponse,
  getRequestUser,
  hasAnyPermission,
  hasPermission,
  unauthorizedResponse,
} from "@/lib/rbac";

export const dynamic = "force-dynamic";

async function buildAiConfig(includeSecrets: boolean) {
  const [setting, models] = await Promise.all([
    prisma.aiSetting.findUnique({ where: { id: "default" } }),
    prisma.aiModel.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  const activeRaw =
    models.find((m) => m.id === setting?.activeModelId) || models[0] || null;
  const activeModel = activeRaw
    ? {
        id: activeRaw.id,
        name: activeRaw.name,
        provider: activeRaw.provider,
        modelId: activeRaw.modelId,
        endpoint: activeRaw.endpoint,
        description: activeRaw.description,
        addedBy: activeRaw.addedBy,
        createdAt: activeRaw.createdAt.toISOString(),
      }
    : null;

  return {
    activeModel,
    hospitalSystemPrompt:
      setting?.hospitalSystemPrompt ||
      "Vous êtes l'Assistant IA officiel d'E-HOSPIA.",
    temperature: setting?.temperature ?? 0.2,
    ...(includeSecrets
      ? {
          models: models.map((m) => ({
            ...m,
            createdAt: m.createdAt.toISOString(),
          })),
        }
      : {}),
  };
}

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) return unauthorizedResponse();
    if (!hasAnyPermission(user, [PERMISSIONS.AI_USE, PERMISSIONS.AI_MANAGE])) {
      return forbiddenResponse(PERMISSIONS.AI_USE);
    }

    const aiConfig = await buildAiConfig(
      hasPermission(user, PERMISSIONS.AI_MANAGE)
    );
    return NextResponse.json({ aiConfig });
  } catch (error) {
    console.error("AI GET error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement de la configuration IA" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) return unauthorizedResponse();

    const body = await request.json();
    const { action } = body as { action: string };

    if (action === "add_model") {
      if (!hasPermission(user, PERMISSIONS.AI_MANAGE)) {
        return forbiddenResponse(PERMISSIONS.AI_MANAGE);
      }
      const {
        name,
        provider,
        modelId,
        endpoint,
        apiKey,
        description,
        setAsActive,
      } = body as {
        name: string;
        provider: string;
        modelId: string;
        endpoint?: string;
        apiKey?: string;
        description?: string;
        setAsActive?: boolean;
      };

      if (!name?.trim() || !modelId?.trim()) {
        return NextResponse.json(
          {
            error:
              "Le nom du modèle et l'identifiant technique (modelId) sont requis",
          },
          { status: 400 }
        );
      }

      const created = await prisma.aiModel.create({
        data: {
          name: name.trim(),
          provider: provider || "OPENAI_COMPATIBLE",
          modelId: modelId.trim(),
          endpoint:
            endpoint?.trim() ||
            (provider === "GOOGLE_GEMINI"
              ? "https://generativelanguage.googleapis.com/v1beta"
              : provider === "OLLAMA_LOCAL"
                ? "http://localhost:11434/v1"
                : "https://api.openai.com/v1"),
          apiKey: apiKey?.trim() || "",
          description:
            description?.trim() ||
            `Modèle ${provider || "personnalisé"} ajouté par l'Administration.`,
          addedBy: user.fullName,
        },
      });

      if (setAsActive) {
        await prisma.aiSetting.upsert({
          where: { id: "default" },
          create: {
            id: "default",
            activeModelId: created.id,
            hospitalSystemPrompt:
              "Vous êtes l'Assistant IA officiel d'E-HOSPIA.",
            temperature: 0.2,
          },
          update: { activeModelId: created.id },
        });
      }

      return NextResponse.json(
        {
          model: created,
          aiConfig: await buildAiConfig(true),
        },
        { status: 201 }
      );
    }

    if (action === "set_active_model") {
      if (!hasPermission(user, PERMISSIONS.AI_MANAGE)) {
        return forbiddenResponse(PERMISSIONS.AI_MANAGE);
      }
      const { modelId } = body as { modelId: string };
      const found = await prisma.aiModel.findUnique({ where: { id: modelId } });
      if (!found) {
        return NextResponse.json(
          { error: "Modèle IA introuvable" },
          { status: 404 }
        );
      }

      await prisma.aiSetting.upsert({
        where: { id: "default" },
        create: {
          id: "default",
          activeModelId: found.id,
          hospitalSystemPrompt:
            "Vous êtes l'Assistant IA officiel d'E-HOSPIA.",
          temperature: 0.2,
        },
        update: { activeModelId: found.id },
      });

      return NextResponse.json({ aiConfig: await buildAiConfig(true) });
    }

    if (action === "update_settings") {
      if (!hasPermission(user, PERMISSIONS.AI_MANAGE)) {
        return forbiddenResponse(PERMISSIONS.AI_MANAGE);
      }
      const {
        hospitalSystemPrompt,
        temperature,
        targetModelId,
        apiKey,
        endpoint,
      } = body as {
        hospitalSystemPrompt?: string;
        temperature?: number;
        targetModelId?: string;
        apiKey?: string;
        endpoint?: string;
      };

      if (hospitalSystemPrompt !== undefined || temperature !== undefined) {
        await prisma.aiSetting.update({
          where: { id: "default" },
          data: {
            ...(hospitalSystemPrompt !== undefined
              ? { hospitalSystemPrompt }
              : {}),
            ...(temperature !== undefined
              ? { temperature: Math.min(1, Math.max(0, Number(temperature))) }
              : {}),
          },
        });
      }

      if (targetModelId) {
        await prisma.aiModel.updateMany({
          where: { id: targetModelId },
          data: {
            ...(apiKey !== undefined ? { apiKey } : {}),
            ...(endpoint !== undefined ? { endpoint } : {}),
          },
        });
      }

      return NextResponse.json({ aiConfig: await buildAiConfig(true) });
    }

    if (action === "delete_model") {
      if (!hasPermission(user, PERMISSIONS.AI_MANAGE)) {
        return forbiddenResponse(PERMISSIONS.AI_MANAGE);
      }
      const { modelId } = body as { modelId: string };
      const allModels = await prisma.aiModel.findMany({
        orderBy: { createdAt: "asc" },
      });
      if (allModels.length <= 1) {
        return NextResponse.json(
          { error: "Impossible de supprimer le dernier modèle disponible" },
          { status: 400 }
        );
      }

      await prisma.aiModel.delete({ where: { id: modelId } });
      const remaining = allModels.filter((m) => m.id !== modelId);
      const setting = await prisma.aiSetting.findUnique({
        where: { id: "default" },
      });
      if (setting?.activeModelId === modelId && remaining[0]) {
        await prisma.aiSetting.update({
          where: { id: "default" },
          data: { activeModelId: remaining[0].id },
        });
      }

      return NextResponse.json({ aiConfig: await buildAiConfig(true) });
    }

    if (action === "chat") {
      if (!hasPermission(user, PERMISSIONS.AI_USE)) {
        return forbiddenResponse(PERMISSIONS.AI_USE);
      }
      const { prompt } = body as { prompt: string };
      if (!prompt?.trim()) {
        return NextResponse.json(
          { error: "Veuillez saisir une question" },
          { status: 400 }
        );
      }

      const [setting, models] = await Promise.all([
        prisma.aiSetting.findUnique({ where: { id: "default" } }),
        prisma.aiModel.findMany({ orderBy: { createdAt: "asc" } }),
      ]);
      const activeModel =
        models.find((m) => m.id === setting?.activeModelId) || models[0];
      if (!activeModel) {
        return NextResponse.json(
          { error: "Aucun modèle IA configuré" },
          { status: 400 }
        );
      }

      const result = await generateRbacAiReply(
        user,
        activeModel,
        setting?.hospitalSystemPrompt ||
          "Vous êtes l'Assistant IA officiel d'E-HOSPIA.",
        setting?.temperature ?? 0.2,
        prompt.trim()
      );
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Action IA invalide" }, { status: 400 });
  } catch (error) {
    console.error("AI POST error:", error);
    return NextResponse.json(
      { error: "Erreur lors du traitement de la requête IA" },
      { status: 500 }
    );
  }
}

async function generateRbacAiReply(
  user: AuthUser,
  model: {
    id: string;
    name: string;
    provider: string;
    modelId: string;
    endpoint: string;
    apiKey: string;
  },
  hospitalSystemPrompt: string,
  temperature: number,
  prompt: string
) {
  const perms = new Set(user.effectivePermissions);
  const canViewDepts = perms.has(PERMISSIONS.DEPARTMENTS_VIEW);
  const canViewDirectory = perms.has(PERMISSIONS.PROFILES_VIEW_DIRECTORY);
  const canViewAllFolders = perms.has(PERMISSIONS.FOLDER_VIEW_ALL);
  const canViewOwnFolder = perms.has(PERMISSIONS.FOLDER_VIEW_OWN);
  const canViewAllBilling = perms.has(PERMISSIONS.BILLING_VIEW_ALL);
  const canViewOwnBilling = perms.has(PERMISSIONS.BILLING_VIEW_OWN);
  const canCommunicate = perms.has(PERMISSIONS.DEPARTMENTS_COMMUNICATE);
  const canTransfer = perms.has(PERMISSIONS.DEPARTMENTS_TRANSFER);
  const canManageRbac = perms.has(PERMISSIONS.RBAC_MANAGE);

  const scopeLabels: string[] = [];
  if (canViewDepts) scopeLabels.push("Capacité & Lits des 8 départements");
  if (canViewDirectory)
    scopeLabels.push("Annuaire & Effectifs (Médecins, Infirmiers)");
  if (canViewAllFolders) scopeLabels.push("Tous les dossiers médicaux");
  else if (canViewOwnFolder)
    scopeLabels.push(
      `Dossier personnel (${user.patientProfile?.folderNumber || "Patient"})`
    );
  if (canViewAllBilling) scopeLabels.push("Facturation globale");
  else if (canViewOwnBilling) scopeLabels.push("Factures personnelles");
  const rbacScope = scopeLabels.join(" • ") || "Profil de base";

  const q = prompt.toLowerCase();

  // 1. Medical & E-HOSPIA Domain Filter
  const hasExplicitExternalTopic =
    /\b(rmse|mse|mae|r2|equation|équation|formula|formule|integral|intégrale|derivative|dérivée|matrix|matrice|calculus|algebra|trigonometry|geometry|python|javascript|typescript|java|c\+\+|sql|html|css|react|leetcode|algorithm|algorithme|capital of|capitale de|president|président|weather|météo|meteo|recipe|recette|football|soccer|world cup|movie|film|song|chanson|poem|poème|poeme|joke|blague|bitcoin|crypto|stock market|planet|planète|solar system)\b/i.test(
      q
    );

  if (hasExplicitExternalTopic) {
    return {
      reply: `🚫 **Hors périmètre Médical & E-HOSPIA** (modèle actif : **${model.name}**)\n\nJe suis l'assistant médical et hospitalier d'**E-HOSPIA**. Je réponds uniquement aux questions liées aux données internes d'E-HOSPIA autorisées par votre profil et aux questions de santé, médecine et soins hospitaliers.`,
      modelUsed: {
        id: model.id,
        name: model.name,
        modelId: model.modelId,
        provider: model.provider,
      },
      mode: "LOCAL_DEMO",
      rbacScope,
    };
  }

  // 2. Strict RBAC Guardrails
  const asksHospitalCapacity =
    /\b(lit|lits|bed|beds|capacit[eé]|capacite|capacity|vide|vides|empty|libre|libres|free|occup[eé]s?|occupied|occupation|satur|alerte|combien.*service|d[eé]partement|departement|department)\b/.test(
      q
    );
  if (asksHospitalCapacity && !canViewDepts) {
    return {
      reply: `🔒 **Accès refusé par le contrôle RBAC E-HOSPIA** (modèle actif : **${model.name}**)\n\nVotre profil (**${user.roleNames.join(", ")}**) ne possède pas la permission \`departments.view\`. Les informations sur la capacité des départements, les lits occupés, les lits vides et les niveaux d'alerte de l'hôpital sont strictement réservées à l'Administration, aux Médecins et aux Infirmiers.`,
      modelUsed: {
        id: model.id,
        name: model.name,
        modelId: model.modelId,
        provider: model.provider,
      },
      mode: "LOCAL_DEMO",
      rbacScope,
    };
  }

  const refersToOwnDoctors = /\b(mes|my|do i|me suivent|s'occupent de moi)\b/.test(
    q
  );
  const asksHospitalStaff =
    /\b(how many.*(doctor|doctors|nurse|nurses|staff)|combien.*(m[eé]decin|medecins|docteur|infirmier|infirmi[eè]re|personnel|effectif)|annuaire|directory|liste.*(m[eé]decin|infirmier|staff))\b/.test(
      q
    );
  if (
    asksHospitalStaff &&
    !canViewDirectory &&
    !(canViewOwnFolder && refersToOwnDoctors)
  ) {
    return {
      reply: `🔒 **Accès refusé par le contrôle RBAC E-HOSPIA** (modèle actif : **${model.name}**)\n\nVotre profil (**${user.roleNames.join(", ")}**) ne possède pas la permission \`profiles.view_directory\`. L'annuaire global et le décompte des effectifs hospitaliers ne sont pas accessibles à votre rôle.`,
      modelUsed: {
        id: model.id,
        name: model.name,
        modelId: model.modelId,
        provider: model.provider,
      },
      mode: "LOCAL_DEMO",
      rbacScope,
    };
  }

  const mentionsSpecificPatientOrRecord =
    /\b(yasmine|alaoui|lucas|fernandez|l[eé]o|leo|dubois|adam|martin|dos-2026|cas-2026|case-10|case-20|case-30|case-40|dossier m[eé]dical|dossiers m[eé]dicaux|dossier patient|dossiers patients|patient folder|patient record|nos patients|our patients|cas m[eé]dical|cas m[eé]dicaux|medical case)\b/.test(
      q
    ) ||
    (/\b(dossier|diagnostic|diagnosis|allergie|prescription|constante|vitals|spo2)\b/.test(
      q
    ) &&
      /\b(patient|patients|h[oô]pital|hospital|ehospia)\b/.test(q));

  if (
    mentionsSpecificPatientOrRecord &&
    !canViewAllFolders &&
    !canViewOwnFolder
  ) {
    return {
      reply: `🔒 **Secret médical protégé** (modèle actif : **${model.name}**)\n\nVotre profil (**${user.roleNames.join(", ")}**) ne dispose pas de la permission clinique \`folder.view_all\`. Conformément au secret médical d'E-HOSPIA, l'Assistant IA ne peut pas consulter ni résumer les diagnostics ou dossiers médicaux des patients de l'hôpital.`,
      modelUsed: {
        id: model.id,
        name: model.name,
        modelId: model.modelId,
        provider: model.provider,
      },
      mode: "LOCAL_DEMO",
      rbacScope,
    };
  }

  // 3. Build RBAC-filtered context from SQLite
  const contextPayload: Record<string, unknown> = {
    utilisateur: {
      nom: user.fullName,
      profil: user.profileType,
      roles: user.roleNames,
      permissionsActives: user.effectivePermissions,
    },
  };

  if (canViewDepts) {
    const depts = await prisma.department.findMany({
      include: {
        doctors: { include: { user: { select: { fullName: true } } } },
        nurses: true,
        _count: {
          select: { medicalCases: { where: { status: { not: "CLOTURE" } } } },
        },
      },
    });
    const totalBeds = depts.reduce((s, d) => s + d.totalBeds, 0);
    const occupiedBeds = depts.reduce((s, d) => s + d.occupiedBeds, 0);
    contextPayload.syntheseCapacitaireHopital = {
      nombreDepartements: depts.length,
      capaciteTotaleLitsHopital: totalBeds,
      totalLitsOccupesHopital: occupiedBeds,
      totalLitsVidesDisponiblesHopital: Math.max(0, totalBeds - occupiedBeds),
      tauxOccupationGlobal: `${totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0}%`,
    };
    contextPayload.departements = depts.map((d) => ({
      nom: d.name,
      etage: d.floor,
      posteInterne: d.phoneExtension,
      totalBeds: d.totalBeds,
      occupiedBeds: d.occupiedBeds,
      litsVides: Math.max(0, d.totalBeds - d.occupiedBeds),
      alertLevel: d.alertLevel,
      nombreMedecinsRattaches: d.doctors.length,
      ...(canViewDirectory
        ? { medecinsRattaches: d.doctors.map((doc) => doc.user.fullName) }
        : {}),
      nombreInfirmiersRattaches: d.nurses.length,
      nombreCasActifs: d._count.medicalCases,
    }));
  }

  if (canViewDirectory) {
    const allUsers = await prisma.user.findMany({
      include: {
        doctorProfile: { include: { department: true } },
        nurseProfile: { include: { department: true } },
        adminProfile: true,
        financialProfile: true,
        patientProfile: true,
      },
    });
    const doctors = allUsers.filter((u) => u.doctorProfile);
    const nurses = allUsers.filter((u) => u.nurseProfile);
    const admins = allUsers.filter((u) => u.adminProfile);
    const financials = allUsers.filter((u) => u.financialProfile);
    const patients = allUsers.filter((u) => u.patientProfile);

    contextPayload.effectifsEtAnnuaireHopital = {
      nombreTotalUtilisateurs: allUsers.length,
      nombreTotalMedecins: doctors.length,
      nombreTotalInfirmiers: nurses.length,
      nombreTotalAdministrateurs: admins.length,
      nombreTotalFinanciers: financials.length,
      nombreTotalPatientsEnregistres: patients.length,
      medecins: doctors.map((u) => ({
        nom: u.fullName,
        specialite: u.doctorProfile!.specialty,
        grade: u.doctorProfile!.grade,
        departement: u.doctorProfile!.department.name,
        disponibilite: u.doctorProfile!.availability,
      })),
      infirmiers: nurses.map((u) => ({
        nom: u.fullName,
        qualification: u.nurseProfile!.qualification,
        departement: u.nurseProfile!.department.name,
        poste: u.nurseProfile!.shift,
      })),
    };
  }

  if (canCommunicate) {
    const msgs = await prisma.departmentMessage.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { fromDepartment: true, toDepartment: true },
    });
    contextPayload.communicationsInterServices = msgs.map((m) => ({
      de: m.fromDepartment.name,
      vers: m.toDepartment.name,
      objet: m.subject,
      priorite: m.priority,
      statut: m.status,
    }));
  }

  if (canTransfer) {
    const trs = await prisma.departmentTransfer.findMany({
      orderBy: { createdAt: "desc" },
      include: { fromDepartment: true, toDepartment: true },
    });
    contextPayload.transfertsInterServices = trs.map((t) => ({
      de: t.fromDepartment.name,
      vers: t.toDepartment.name,
      motif: t.reason,
      priorite: t.priority,
      statut: t.status,
    }));
  }

  if (canManageRbac) {
    const [roles, permCount] = await Promise.all([
      prisma.role.findMany({
        include: { _count: { select: { permissions: true, users: true } } },
      }),
      prisma.permission.count(),
    ]);
    contextPayload.resumeRbac = {
      nombreRoles: roles.length,
      nombrePermissions: permCount,
      roles: roles.map((r) => ({
        nom: r.name,
        code: r.code,
        nombrePermissions: r._count.permissions,
        nombreUtilisateurs: r._count.users,
      })),
    };
  }

  if (canViewAllFolders) {
    const patients = await prisma.patientProfile.findMany({
      include: {
        user: { select: { fullName: true } },
        medicalCases: {
          include: {
            department: true,
            assignedDoctors: {
              include: { doctor: { include: { user: true } } },
            },
            vitalSignLogs: { take: 1, orderBy: { recordedAt: "desc" } },
          },
        },
      },
    });
    contextPayload.dossiersMedicaux = patients.map((p) => ({
      patient: p.user.fullName,
      dossier: p.folderNumber,
      groupeSanguin: p.bloodType,
      allergies: p.allergies,
      cas: p.medicalCases.map((mc) => ({
        numero: mc.caseNumber,
        titre: mc.title,
        service: mc.department.name,
        statut: mc.status,
        priorite: mc.priority,
        diagnostic: mc.diagnosis,
        traitement: mc.treatmentPlan,
        medecins: mc.assignedDoctors.map((ad) => ({
          nom: ad.doctor.user.fullName,
          role: ad.roleInCase,
        })),
        dernieresConstantes: mc.vitalSignLogs[0] || null,
      })),
    }));
  } else if (canViewOwnFolder && user.patientProfile) {
    const myCases = await prisma.medicalCase.findMany({
      where: { patientId: user.patientProfile.id },
      include: {
        department: true,
        assignedDoctors: { include: { doctor: { include: { user: true } } } },
      },
    });
    contextPayload.monDossierPersonnel = {
      dossier: user.patientProfile.folderNumber,
      groupeSanguin: user.patientProfile.bloodType,
      allergies: user.patientProfile.allergies,
      antecedents: user.patientProfile.chronicConditions,
      mesCas: myCases.map((mc) => ({
        numero: mc.caseNumber,
        titre: mc.title,
        service: mc.department.name,
        statut: mc.status,
        diagnostic: mc.diagnosis,
        traitement: mc.treatmentPlan,
        medecins: mc.assignedDoctors.map((ad) => ({
          nom: ad.doctor.user.fullName,
          role: ad.roleInCase,
        })),
      })),
    };
  }

  if (canViewAllBilling) {
    const invs = await prisma.invoice.findMany();
    contextPayload.factures = invs.map((i) => ({
      numero: i.invoiceNumber,
      total: i.totalAmount,
      mutuelle: i.insuranceCovered,
      restePatient: i.patientResponsibility,
      statut: i.status,
    }));
  } else if (canViewOwnBilling && user.patientProfile) {
    const invs = await prisma.invoice.findMany({
      where: { patientId: user.patientProfile.id },
    });
    contextPayload.mesFactures = invs.map((i) => ({
      numero: i.invoiceNumber,
      description: i.description,
      total: i.totalAmount,
      mutuelle: i.insuranceCovered,
      resteAPayer: i.patientResponsibility,
      statut: i.status,
    }));
  }

  // 4. Call Live LLM (Ollama / Gemini / OpenAI-compatible) if configured
  const isOllama =
    model.provider === "OLLAMA_LOCAL" || model.endpoint.includes("11434");
  const isLocalOpenAi =
    model.provider !== "LOCAL_DEMO" &&
    (model.endpoint.includes("localhost") ||
      model.endpoint.includes("127.0.0.1"));
  const hasApiKey = Boolean(model.apiKey && model.apiKey.trim().length > 0);
  const shouldCallLiveApi =
    model.provider !== "LOCAL_DEMO" &&
    (isOllama || isLocalOpenAi || hasApiKey);

  let liveErrorNote = "";

  if (shouldCallLiveApi) {
    try {
      const systemMsg = `${hospitalSystemPrompt}
RÈGLES STRICTES OBLIGATOIRES (ASSISTANT MÉDICAL & HOSPITALIER E-HOSPIA) :
1. Tu es autorisé à répondre uniquement à deux types de demandes :
   (a) Les questions sur les données internes d'E-HOSPIA fournies ci-dessous (services, lits, effectifs, dossiers autorisés, factures).
   (b) Les questions générales de santé, médecine, pathologies, symptômes, prévention et soins cliniques avec un rappel de consultation médicale si nécessaire.
2. Si la question porte sur un sujet NON médical et NON lié à E-HOSPIA (ex. mathématiques, statistiques, programmation, sport, histoire, géographie, cuisine, météo), refuse poliment en répondant uniquement : "🚫 **Hors périmètre Médical & E-HOSPIA** : Je réponds uniquement aux questions de santé, médecine et aux données de la plateforme E-HOSPIA."
3. Pour les questions sur les données d'E-HOSPIA, utilise strictement les valeurs et totaux exacts pré-calculés du JSON ci-dessous (ex. nombreTotalMedecins, totalLitsOccupesHopital, totalLitsVidesDisponiblesHopital) sans jamais inventer de patients ou de données absentes.
4. Réponds dans la langue de la question (français ou anglais), en Markdown propre (titres, listes à puces \`-\`, **gras**), sans jamais utiliser de syntaxe LaTeX (\`$$\`, \`\\frac\`, \`\\sqrt\`).
Données internes E-HOSPIA autorisées pour ${user.fullName} (JSON RBAC filtré) :
${JSON.stringify(contextPayload)}`;

      const sanitizeLiveText = (text: string) => {
        if (/\$\$|\\frac|\\sqrt|\\sum/.test(text)) {
          return {
            reply: `🚫 **Hors périmètre Médical & E-HOSPIA** (modèle actif : **${model.name}**)\n\nJe suis strictement limité aux questions de santé, médecine et aux données de la plateforme **E-HOSPIA**.`,
            modelUsed: {
              id: model.id,
              name: model.name,
              modelId: model.modelId,
              provider: model.provider,
            },
            mode: "LOCAL_DEMO",
            rbacScope,
          };
        }
        return {
          reply: text,
          modelUsed: {
            id: model.id,
            name: model.name,
            modelId: model.modelId,
            provider: model.provider,
          },
          mode: "LIVE_API",
          rbacScope,
        };
      };

      if (model.provider === "GOOGLE_GEMINI" && hasApiKey) {
        const endpointBase = model.endpoint.replace(/\/$/, "");
        const url = `${endpointBase}/models/${encodeURIComponent(model.modelId)}:generateContent?key=${encodeURIComponent(model.apiKey)}`;
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: `${systemMsg}\n\nQuestion : ${prompt}` }],
              },
            ],
            generationConfig: { temperature },
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return sanitizeLiveText(text);
        } else {
          liveErrorNote = `HTTP ${resp.status}`;
        }
      } else if (isOllama) {
        const ollamaBase =
          model.endpoint
            .replace(/localhost/g, "127.0.0.1")
            .replace(/\/(v1|api\/chat|api\/generate)\/?$/, "")
            .replace(/\/$/, "") || "http://127.0.0.1:11434";
        const resp = await fetch(`${ollamaBase}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: model.modelId,
            stream: false,
            think: false,
            options: { temperature },
            messages: [
              { role: "system", content: systemMsg },
              { role: "user", content: prompt },
            ],
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          const text = data?.message?.content;
          if (text) return sanitizeLiveText(text);
        } else {
          const errText = await resp.text().catch(() => "");
          liveErrorNote = `Ollama HTTP ${resp.status}${errText ? ` (${errText.slice(0, 80)})` : ""}`;
        }
      } else {
        const endpointBase = model.endpoint.replace(/\/$/, "");
        const reqHeaders: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (hasApiKey) reqHeaders.Authorization = `Bearer ${model.apiKey}`;
        const resp = await fetch(`${endpointBase}/chat/completions`, {
          method: "POST",
          headers: reqHeaders,
          body: JSON.stringify({
            model: model.modelId,
            temperature,
            messages: [
              { role: "system", content: systemMsg },
              { role: "user", content: prompt },
            ],
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          const text = data?.choices?.[0]?.message?.content;
          if (text) return sanitizeLiveText(text);
        } else {
          liveErrorNote = `HTTP ${resp.status}`;
        }
      }
    } catch (err) {
      liveErrorNote =
        err instanceof Error ? err.message : "Connexion au serveur IA échouée";
    }
  }

  // 5. Fallback Local Deterministic Engine
  const lines: string[] = [];
  if (
    /^(hi|hello|hey|bonjour|bonsoir|salut|coucou|yo)[!.\s?]*$/i.test(
      prompt.trim()
    ) ||
    /\b(what are you|who are you|what can you do|qui es[- ]tu|c'est quoi|que fais[- ]tu|aide|help)\b/i.test(
      q
    )
  ) {
    lines.push(
      `Bonjour **${user.fullName}** ! Je suis l'Assistant IA **E-HOSPIA** (modèle actif : **${model.name}** / \`${model.modelId}\`).`
    );
    lines.push(`Votre périmètre RBAC autorisé : **${rbacScope}**.`);
  } else if (
    /\b(diabet|diab[eè]te)\b/.test(q) &&
    !mentionsSpecificPatientOrRecord
  ) {
    lines.push(
      `**Symptômes fréquents du diabète :**\n- **Soif intense** (polydipsie)\n- **Mictions fréquentes** (polyurie)\n- **Fatigue inhabituelle**\n- **Vision floue** ou perte de poids inexpliquée\n\n*Consultez un professionnel de santé pour un bilan glycémique.*`
    );
  } else if (canViewDepts) {
    const depts = await prisma.department.findMany();
    const total = depts.reduce((s, d) => s + d.totalBeds, 0);
    const occ = depts.reduce((s, d) => s + d.occupiedBeds, 0);
    lines.push(
      `**Synthèse capacitaire des 8 départements :** ${occ}/${total} lits occupés (**${Math.max(0, total - occ)} lits vides**).`
    );
  } else if (canViewOwnFolder && user.patientProfile) {
    const myCases = await prisma.medicalCase.findMany({
      where: { patientId: user.patientProfile.id },
      include: { department: true },
    });
    lines.push(
      `Bonjour **${user.fullName}**, vous avez **${myCases.length} cas médical(aux)** en cours dans votre dossier **${user.patientProfile.folderNumber}**.`
    );
  } else if (canViewAllBilling) {
    const invs = await prisma.invoice.findMany();
    const total = invs.reduce((s, i) => s + i.totalAmount, 0);
    lines.push(
      `**Analyse financière :** ${invs.length} factures pour un total de **${total} €**.`
    );
  } else {
    lines.push("Posez-moi une question sur votre espace autorisé.");
  }

  if (liveErrorNote) {
    lines.push(
      `\n⚠️ *Repli local : le serveur configuré (\`${model.endpoint}\`) a renvoyé \`${liveErrorNote}\`.*`
    );
  }

  return {
    reply: lines.join("\n"),
    modelUsed: {
      id: model.id,
      name: model.name,
      modelId: model.modelId,
      provider: model.provider,
    },
    mode: "LOCAL_DEMO",
    rbacScope,
  };
}
