import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  forbiddenResponse,
  getRequestUser,
  hasPermission,
  unauthorizedResponse,
} from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.DEPARTMENTS_VIEW)) {
      return forbiddenResponse(PERMISSIONS.DEPARTMENTS_VIEW);
    }

    const canViewAllFolders = hasPermission(user, PERMISSIONS.FOLDER_VIEW_ALL);
    const ownPatientId = user.patientProfile?.id;

    const departments = await prisma.department.findMany({
      include: {
        doctors: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                avatarColor: true,
              },
            },
          },
        },
        nurses: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                avatarColor: true,
              },
            },
          },
        },
        medicalCases: {
          where: canViewAllFolders
            ? undefined
            : ownPatientId
              ? { patientId: ownPatientId }
              : { id: "__none__" },
          orderBy: { openedAt: "desc" },
          include: {
            patient: {
              include: {
                user: { select: { fullName: true, avatarColor: true } },
              },
            },
            leadDoctor: {
              include: {
                user: { select: { fullName: true } },
              },
            },
            assignedDoctors: {
              include: {
                doctor: {
                  include: {
                    user: { select: { fullName: true } },
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            medicalCases: { where: { status: { not: "CLOTURE" } } },
            incomingMessages: { where: { status: "NON_LU" } },
            incomingTransfers: { where: { status: "EN_ATTENTE" } },
          },
        },
      },
    });

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

    return NextResponse.json({ departments });
  } catch (error) {
    console.error("Departments GET error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des départements" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.DEPARTMENTS_MANAGE)) {
      return forbiddenResponse(PERMISSIONS.DEPARTMENTS_MANAGE);
    }

    const body = await request.json();
    const { id, alertLevel, occupiedBeds, totalBeds, phoneExtension, description } =
      body as {
        id: string;
        alertLevel?: string;
        occupiedBeds?: number;
        totalBeds?: number;
        phoneExtension?: string;
        description?: string;
      };

    if (!id) {
      return NextResponse.json(
        { error: "ID département requis" },
        { status: 400 }
      );
    }

    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Département introuvable" },
        { status: 404 }
      );
    }

    const nextTotal =
      totalBeds !== undefined
        ? Math.max(1, Number(totalBeds))
        : existing.totalBeds;
    const nextOccupied =
      occupiedBeds !== undefined
        ? Math.min(nextTotal, Math.max(0, Number(occupiedBeds)))
        : Math.min(nextTotal, existing.occupiedBeds);

    const updated = await prisma.department.update({
      where: { id },
      data: {
        alertLevel: alertLevel ?? existing.alertLevel,
        totalBeds: nextTotal,
        occupiedBeds: nextOccupied,
        phoneExtension: phoneExtension ?? existing.phoneExtension,
        description: description ?? existing.description,
      },
    });

    return NextResponse.json({ department: updated });
  } catch (error) {
    console.error("Departments PATCH error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du département" },
      { status: 500 }
    );
  }
}
