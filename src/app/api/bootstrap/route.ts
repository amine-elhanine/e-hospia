import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  getRequestUser,
  hasPermission,
  unauthorizedResponse,
} from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const currentUser = await getRequestUser(request);
    if (!currentUser) {
      return unauthorizedResponse();
    }

    const canViewDepartments = hasPermission(
      currentUser,
      PERMISSIONS.DEPARTMENTS_VIEW
    );
    const canViewOwnFolder = hasPermission(
      currentUser,
      PERMISSIONS.FOLDER_VIEW_OWN
    );
    const canViewAllBilling = hasPermission(
      currentUser,
      PERMISSIONS.BILLING_VIEW_ALL
    );
    const canManageAi = hasPermission(currentUser, PERMISSIONS.AI_MANAGE);

    const [departments, allPermissions, aiSetting, aiModels] = await Promise.all([
      canViewDepartments
        ? prisma.department.findMany({
            include: {
              _count: {
                select: {
                  doctors: true,
                  nurses: true,
                  medicalCases: { where: { status: { not: "CLOTURE" } } },
                  incomingMessages: { where: { status: "NON_LU" } },
                  incomingTransfers: { where: { status: "EN_ATTENTE" } },
                },
              },
            },
          })
        : Promise.resolve([]),
      prisma.permission.findMany({
        orderBy: [{ category: "asc" }, { code: "asc" }],
      }),
      prisma.aiSetting.findUnique({ where: { id: "default" } }),
      prisma.aiModel.findMany({ orderBy: { createdAt: "asc" } }),
    ]);

    if (canViewDepartments && departments.length > 0) {
      const deptOrder = [
        "URGENCE",
        "DECHOCAGE",
        "REANIMATION",
        "PSYCHIATRIE",
        "PEDIATRIE",
        "GYNECOLOGIE",
        "MATERNITE",
        "NEONAT",
      ];
      departments.sort(
        (a, b) => deptOrder.indexOf(a.code) - deptOrder.indexOf(b.code)
      );
    }

    let patientFolderSummary = null;
    if (canViewOwnFolder && currentUser.patientProfile?.id) {
      const [medicalCases, invoices] = await Promise.all([
        prisma.medicalCase.findMany({
          where: { patientId: currentUser.patientProfile.id },
          orderBy: { openedAt: "desc" },
          include: {
            department: { select: { id: true, name: true, color: true } },
            leadDoctor: {
              select: {
                specialty: true,
                user: { select: { fullName: true } },
              },
            },
            assignedDoctors: {
              select: {
                roleInCase: true,
                doctor: {
                  select: {
                    specialty: true,
                    user: { select: { fullName: true } },
                    department: { select: { name: true } },
                  },
                },
              },
            },
            _count: {
              select: {
                clinicalNotes: true,
                vitalSignLogs: true,
              },
            },
          },
        }),
        prisma.invoice.findMany({
          where: { patientId: currentUser.patientProfile.id },
          orderBy: { issuedAt: "desc" },
          select: {
            id: true,
            invoiceNumber: true,
            description: true,
            totalAmount: true,
            insuranceCovered: true,
            patientResponsibility: true,
            status: true,
            issuedAt: true,
            department: { select: { name: true, color: true } },
          },
        }),
      ]);
      patientFolderSummary = { medicalCases, invoices };
    }

    let billingSummary = null;
    if (canViewAllBilling) {
      const allInvoices = await prisma.invoice.findMany({
        select: {
          totalAmount: true,
          insuranceCovered: true,
          patientResponsibility: true,
          status: true,
        },
      });
      billingSummary = {
        totalBilled: allInvoices.reduce((s, i) => s + i.totalAmount, 0),
        totalCovered: allInvoices.reduce((s, i) => s + i.insuranceCovered, 0),
        totalPatientResponsibility: allInvoices.reduce(
          (s, i) => s + i.patientResponsibility,
          0
        ),
        pendingCount: allInvoices.filter((i) => i.status === "EN_ATTENTE")
          .length,
        paidCount: allInvoices.filter((i) => i.status === "PAYEE").length,
        invoiceCount: allInvoices.length,
      };
    }

    const activeRaw =
      aiModels.find((m) => m.id === aiSetting?.activeModelId) ||
      aiModels[0] ||
      null;
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

    const aiConfig = {
      activeModel,
      hospitalSystemPrompt:
        aiSetting?.hospitalSystemPrompt ||
        "Vous êtes l'Assistant IA officiel d'E-HOSPIA.",
      temperature: aiSetting?.temperature ?? 0.2,
      ...(canManageAi
        ? {
            models: aiModels.map((m) => ({
              ...m,
              createdAt: m.createdAt.toISOString(),
            })),
          }
        : {}),
    };

    return NextResponse.json({
      currentUser,
      departments,
      allPermissions,
      aiConfig,
      roleContext: {
        patientFolderSummary,
        billingSummary,
      },
    });
  } catch (error) {
    console.error("Bootstrap error:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de l'initialisation" },
      { status: 500 }
    );
  }
}
