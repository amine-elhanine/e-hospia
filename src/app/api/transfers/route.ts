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
        PERMISSIONS.DEPARTMENTS_TRANSFER,
        PERMISSIONS.DEPARTMENTS_VIEW,
      ])
    ) {
      return forbiddenResponse(PERMISSIONS.DEPARTMENTS_TRANSFER);
    }

    const transfers = await prisma.departmentTransfer.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        fromDepartment: true,
        toDepartment: true,
        targetDoctor: {
          include: { user: { select: { fullName: true } } },
        },
        medicalCase: {
          include: {
            patient: {
              include: { user: { select: { fullName: true } } },
            },
          },
        },
      },
    });

    return NextResponse.json({ transfers });
  } catch (error) {
    console.error("Transfers GET error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des transferts" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.DEPARTMENTS_TRANSFER)) {
      return forbiddenResponse(PERMISSIONS.DEPARTMENTS_TRANSFER);
    }

    const body = await request.json();
    const {
      medicalCaseId,
      toDepartmentId,
      targetDoctorId,
      reason,
      clinicalSummary,
      priority,
    } = body as {
      medicalCaseId: string;
      toDepartmentId: string;
      targetDoctorId?: string;
      reason: string;
      clinicalSummary: string;
      priority?: string;
    };

    if (
      !medicalCaseId ||
      !toDepartmentId ||
      !reason?.trim() ||
      !clinicalSummary?.trim()
    ) {
      return NextResponse.json(
        { error: "Cas médical, service cible, motif et résumé clinique requis" },
        { status: 400 }
      );
    }

    const medicalCase = await prisma.medicalCase.findUnique({
      where: { id: medicalCaseId },
    });
    if (!medicalCase) {
      return NextResponse.json(
        { error: "Cas médical introuvable" },
        { status: 404 }
      );
    }

    if (medicalCase.departmentId === toDepartmentId) {
      return NextResponse.json(
        { error: "Le patient se trouve déjà dans ce département" },
        { status: 400 }
      );
    }

    const created = await prisma.departmentTransfer.create({
      data: {
        medicalCaseId,
        fromDepartmentId: medicalCase.departmentId,
        toDepartmentId,
        requestedByUserId: user.id,
        requestedByName: user.fullName,
        targetDoctorId: targetDoctorId || null,
        reason: reason.trim(),
        clinicalSummary: clinicalSummary.trim(),
        priority: priority || "NORMALE",
        status: "EN_ATTENTE",
      },
      include: {
        fromDepartment: true,
        toDepartment: true,
        targetDoctor: { include: { user: { select: { fullName: true } } } },
        medicalCase: {
          include: {
            patient: { include: { user: { select: { fullName: true } } } },
          },
        },
      },
    });

    return NextResponse.json({ transfer: created }, { status: 201 });
  } catch (error) {
    console.error("Transfers POST error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la demande de transfert" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.DEPARTMENTS_TRANSFER)) {
      return forbiddenResponse(PERMISSIONS.DEPARTMENTS_TRANSFER);
    }

    const body = await request.json();
    const { id, status } = body as { id: string; status: "ACCEPTE" | "REFUSE" };

    if (!id || !["ACCEPTE", "REFUSE"].includes(status)) {
      return NextResponse.json(
        { error: "Statut de transfert invalide" },
        { status: 400 }
      );
    }

    const transfer = await prisma.departmentTransfer.findUnique({
      where: { id },
      include: { fromDepartment: true, toDepartment: true },
    });
    if (!transfer) {
      return NextResponse.json(
        { error: "Transfert introuvable" },
        { status: 404 }
      );
    }
    if (transfer.status !== "EN_ATTENTE") {
      return NextResponse.json(
        { error: "Ce transfert a déjà été traité" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedTransfer = await tx.departmentTransfer.update({
        where: { id },
        data: {
          status,
          resolvedAt: new Date(),
        },
        include: {
          fromDepartment: true,
          toDepartment: true,
          targetDoctor: { include: { user: { select: { fullName: true } } } },
          medicalCase: {
            include: {
              patient: { include: { user: { select: { fullName: true } } } },
            },
          },
        },
      });

      if (status === "ACCEPTE") {
        await tx.medicalCase.update({
          where: { id: transfer.medicalCaseId },
          data: {
            departmentId: transfer.toDepartmentId,
          },
        });

        if (transfer.targetDoctorId) {
          await tx.caseDoctorAssignment.upsert({
            where: {
              medicalCaseId_doctorId: {
                medicalCaseId: transfer.medicalCaseId,
                doctorId: transfer.targetDoctorId,
              },
            },
            create: {
              medicalCaseId: transfer.medicalCaseId,
              doctorId: transfer.targetDoctorId,
              roleInCase: `Médecin Récepteur (${transfer.toDepartment.name})`,
            },
            update: {},
          });
        }

        await tx.department.update({
          where: { id: transfer.fromDepartmentId },
          data: {
            occupiedBeds: Math.max(0, transfer.fromDepartment.occupiedBeds - 1),
          },
        });
        await tx.department.update({
          where: { id: transfer.toDepartmentId },
          data: {
            occupiedBeds: Math.min(
              transfer.toDepartment.totalBeds,
              transfer.toDepartment.occupiedBeds + 1
            ),
          },
        });

        await tx.clinicalNote.create({
          data: {
            medicalCaseId: transfer.medicalCaseId,
            authorUserId: user.id,
            authorName: user.fullName,
            authorRole: user.roleNames.join(" / ") || user.profileType,
            noteType: "OBSERVATION",
            content: `Transfert inter-services accepté : ${transfer.fromDepartment.name} → ${transfer.toDepartment.name}. Motif : ${transfer.reason}.`,
          },
        });
      }

      return updatedTransfer;
    });

    return NextResponse.json({ transfer: result });
  } catch (error) {
    console.error("Transfers PATCH error:", error);
    return NextResponse.json(
      { error: "Erreur lors du traitement du transfert" },
      { status: 500 }
    );
  }
}
