import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  forbiddenResponse,
  getRequestUser,
  hasAnyPermission,
  hasPermission,
  unauthorizedResponse,
} from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) return unauthorizedResponse();
    if (
      !hasAnyPermission(user, [
        PERMISSIONS.BILLING_VIEW_ALL,
        PERMISSIONS.BILLING_VIEW_OWN,
      ])
    ) {
      return forbiddenResponse(PERMISSIONS.BILLING_VIEW_ALL);
    }

    const canViewAll = hasPermission(user, PERMISSIONS.BILLING_VIEW_ALL);
    const canManage = hasPermission(user, PERMISSIONS.BILLING_MANAGE);
    const ownPatientId = user.patientProfile?.id;

    if (!canViewAll && !ownPatientId) {
      return NextResponse.json({ invoices: [], scope: "NONE" });
    }

    const invoices = await prisma.invoice.findMany({
      where: canViewAll ? undefined : { patientId: ownPatientId },
      orderBy: { issuedAt: "desc" },
      include: {
        patient: {
          include: {
            user: { select: { fullName: true, email: true } },
          },
        },
        department: true,
        medicalCase: {
          select: { id: true, caseNumber: true, title: true },
        },
      },
    });

    let patientOptions: Array<{
      id: string;
      folderNumber: string;
      user: { fullName: string };
    }> = [];
    let departmentOptions: Array<{ id: string; name: string; color: string }> =
      [];

    if (canManage) {
      [patientOptions, departmentOptions] = await Promise.all([
        prisma.patientProfile.findMany({
          orderBy: { folderNumber: "asc" },
          select: {
            id: true,
            folderNumber: true,
            user: { select: { fullName: true } },
          },
        }),
        prisma.department.findMany({
          orderBy: { name: "asc" },
          select: { id: true, name: true, color: true },
        }),
      ]);
    }

    return NextResponse.json({
      invoices,
      scope: canViewAll ? "ALL" : "OWN",
      patientOptions,
      departmentOptions,
    });
  } catch (error) {
    console.error("Billing GET error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des factures" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.BILLING_MANAGE)) {
      return forbiddenResponse(PERMISSIONS.BILLING_MANAGE);
    }

    const body = await request.json();
    const {
      patientId,
      medicalCaseId,
      departmentId,
      description,
      totalAmount,
      insuranceCovered,
      status,
    } = body as {
      patientId: string;
      medicalCaseId?: string;
      departmentId: string;
      description: string;
      totalAmount: number;
      insuranceCovered: number;
      status?: string;
    };

    if (!patientId || !departmentId || !description?.trim() || totalAmount <= 0) {
      return NextResponse.json(
        { error: "Patient, service, description et montant positif requis" },
        { status: 400 }
      );
    }

    const total = Number(totalAmount);
    const covered = Math.min(total, Math.max(0, Number(insuranceCovered) || 0));
    const responsibility = Math.max(0, total - covered);
    const count = await prisma.invoice.count();
    const invoiceNumber = `FAC-2026-${String(895 + count).padStart(4, "0")}`;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        patientId,
        medicalCaseId: medicalCaseId || null,
        departmentId,
        description: description.trim(),
        totalAmount: total,
        insuranceCovered: covered,
        patientResponsibility: responsibility,
        status: status || "EN_ATTENTE",
        handledByUserId: user.id,
        paidAt: status === "PAYEE" ? new Date() : null,
      },
      include: {
        patient: { include: { user: { select: { fullName: true } } } },
        department: true,
        medicalCase: { select: { id: true, caseNumber: true, title: true } },
      },
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    console.error("Billing POST error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la facture" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.BILLING_MANAGE)) {
      return forbiddenResponse(PERMISSIONS.BILLING_MANAGE);
    }

    const body = await request.json();
    const { id, status } = body as { id: string; status: string };

    if (
      !id ||
      !["EN_ATTENTE", "PAYEE", "PRISE_EN_CHARGE", "PARTIELLE"].includes(status)
    ) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        status,
        handledByUserId: user.id,
        paidAt: status === "PAYEE" ? new Date() : null,
      },
    });

    return NextResponse.json({ invoice });
  } catch (error) {
    console.error("Billing PATCH error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la facture" },
      { status: 500 }
    );
  }
}
