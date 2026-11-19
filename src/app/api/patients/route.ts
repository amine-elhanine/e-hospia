import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  forbiddenResponse,
  getRequestUser,
  hasAnyPermission,
  hasPermission,
  hashPassword,
  unauthorizedResponse,
} from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) return unauthorizedResponse();
    if (
      !hasAnyPermission(user, [
        PERMISSIONS.FOLDER_VIEW_ALL,
        PERMISSIONS.FOLDER_VIEW_OWN,
      ])
    ) {
      return forbiddenResponse(PERMISSIONS.FOLDER_VIEW_ALL);
    }

    const canViewAll = hasPermission(user, PERMISSIONS.FOLDER_VIEW_ALL);
    const ownPatientId = user.patientProfile?.id;

    if (!canViewAll && !ownPatientId) {
      return NextResponse.json({ patients: [], scope: "NONE" });
    }

    const patients = await prisma.patientProfile.findMany({
      where: canViewAll ? undefined : { id: ownPatientId },
      orderBy: { folderNumber: "asc" },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            avatarColor: true,
            isActive: true,
          },
        },
        medicalCases: {
          orderBy: { openedAt: "desc" },
          include: {
            department: true,
            leadDoctor: {
              include: {
                user: {
                  select: { fullName: true, email: true, avatarColor: true },
                },
                department: true,
              },
            },
            assignedDoctors: {
              include: {
                doctor: {
                  include: {
                    user: {
                      select: { fullName: true, email: true, avatarColor: true },
                    },
                    department: true,
                  },
                },
              },
            },
            clinicalNotes: {
              orderBy: { createdAt: "desc" },
            },
            vitalSignLogs: {
              orderBy: { recordedAt: "desc" },
            },
            transfers: {
              orderBy: { createdAt: "desc" },
              include: {
                fromDepartment: true,
                toDepartment: true,
              },
            },
          },
        },
        invoices: {
          orderBy: { issuedAt: "desc" },
          include: { department: true },
        },
      },
    });

    return NextResponse.json({
      patients,
      scope: canViewAll ? "ALL" : "OWN",
    });
  } catch (error) {
    console.error("Patients GET error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des dossiers patients" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) return unauthorizedResponse();
    if (
      !hasAnyPermission(user, [
        PERMISSIONS.PROFILES_MANAGE,
        PERMISSIONS.CASE_CREATE,
      ])
    ) {
      return forbiddenResponse(PERMISSIONS.PROFILES_MANAGE);
    }

    const body = await request.json();
    const {
      fullName,
      email,
      password,
      phone,
      birthDate,
      gender,
      bloodType,
      allergies,
      chronicConditions,
      nationalId,
      emergencyContactName,
      emergencyContactPhone,
      insuranceProvider,
      insuranceNumber,
    } = body as Record<string, string>;

    if (!fullName?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: "Nom complet et email sont obligatoires" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Un utilisateur avec cet email existe déjà" },
        { status: 409 }
      );
    }

    const patientRole = await prisma.role.findUnique({
      where: { code: "ROLE_PATIENT" },
    });

    const folderCount = await prisma.patientProfile.count();
    const folderNumber = `DOS-2026-${String(folderCount + 1).padStart(3, "0")}`;

    const createdUser = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        passwordHash: hashPassword(password || "Patient@2026"),
        fullName: fullName.trim(),
        phone: phone?.trim() || null,
        avatarColor: "#0284c7",
        profileType: "PATIENT",
        patientProfile: {
          create: {
            folderNumber,
            nationalId: nationalId?.trim() || "En cours",
            birthDate: birthDate || "1990-01-01",
            gender: gender || "Non précisé",
            bloodType: bloodType || "Inconnu",
            allergies: allergies?.trim() || "Aucune connue",
            chronicConditions: chronicConditions?.trim() || "Aucune",
            emergencyContactName:
              emergencyContactName?.trim() || "Non renseigné",
            emergencyContactPhone:
              emergencyContactPhone?.trim() || "Non renseigné",
            insuranceProvider: insuranceProvider?.trim() || "CPAM",
            insuranceNumber: insuranceNumber?.trim() || "À compléter",
          },
        },
        roles: patientRole
          ? { create: [{ roleId: patientRole.id }] }
          : undefined,
      },
      include: { patientProfile: true },
    });

    return NextResponse.json(
      { patient: createdUser.patientProfile },
      { status: 201 }
    );
  } catch (error) {
    console.error("Patients POST error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du dossier patient" },
      { status: 500 }
    );
  }
}
