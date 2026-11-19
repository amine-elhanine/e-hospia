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
        PERMISSIONS.DEPARTMENTS_COMMUNICATE,
        PERMISSIONS.DEPARTMENTS_VIEW,
      ])
    ) {
      return forbiddenResponse(PERMISSIONS.DEPARTMENTS_COMMUNICATE);
    }

    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get("departmentId");

    const messages = await prisma.departmentMessage.findMany({
      where: departmentId
        ? {
            OR: [
              { fromDepartmentId: departmentId },
              { toDepartmentId: departmentId },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        fromDepartment: true,
        toDepartment: true,
        medicalCase: {
          include: {
            patient: {
              include: {
                user: { select: { fullName: true } },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Communications GET error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des communications" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.DEPARTMENTS_COMMUNICATE)) {
      return forbiddenResponse(PERMISSIONS.DEPARTMENTS_COMMUNICATE);
    }

    const body = await request.json();
    const {
      fromDepartmentId,
      toDepartmentId,
      medicalCaseId,
      subject,
      content,
      messageType,
      priority,
    } = body as {
      fromDepartmentId: string;
      toDepartmentId: string;
      medicalCaseId?: string;
      subject: string;
      content: string;
      messageType?: string;
      priority?: string;
    };

    if (
      !fromDepartmentId ||
      !toDepartmentId ||
      !subject?.trim() ||
      !content?.trim()
    ) {
      return NextResponse.json(
        { error: "Service émetteur, destinataire, objet et message sont requis" },
        { status: 400 }
      );
    }

    const created = await prisma.departmentMessage.create({
      data: {
        fromDepartmentId,
        toDepartmentId,
        senderUserId: user.id,
        senderName: user.fullName,
        senderRole: user.roleNames.join(" / ") || user.profileType,
        medicalCaseId: medicalCaseId || null,
        subject: subject.trim(),
        content: content.trim(),
        messageType: messageType || "COORDINATION",
        priority: priority || "NORMALE",
        status: "NON_LU",
      },
      include: {
        fromDepartment: true,
        toDepartment: true,
        medicalCase: {
          include: {
            patient: { include: { user: { select: { fullName: true } } } },
          },
        },
      },
    });

    return NextResponse.json({ message: created }, { status: 201 });
  } catch (error) {
    console.error("Communications POST error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'envoi du message inter-services" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.DEPARTMENTS_COMMUNICATE)) {
      return forbiddenResponse(PERMISSIONS.DEPARTMENTS_COMMUNICATE);
    }

    const body = await request.json();
    const { id, status } = body as { id: string; status: string };

    if (!id || !["NON_LU", "LU", "TRAITE"].includes(status)) {
      return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
    }

    const updated = await prisma.departmentMessage.update({
      where: { id },
      data: { status },
      include: {
        fromDepartment: true,
        toDepartment: true,
      },
    });

    return NextResponse.json({ message: updated });
  } catch (error) {
    console.error("Communications PATCH error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du message" },
      { status: 500 }
    );
  }
}
