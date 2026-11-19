import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  forbiddenResponse,
  getRequestUser,
  hasPermission,
  hashPassword,
  unauthorizedResponse,
} from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) return unauthorizedResponse();

    const canViewDirectory = hasPermission(
      user,
      PERMISSIONS.PROFILES_VIEW_DIRECTORY
    );
    const canViewDepts = hasPermission(user, PERMISSIONS.DEPARTMENTS_VIEW);

    const users = await prisma.user.findMany({
      where: canViewDirectory ? undefined : { id: user.id },
      orderBy: [{ profileType: "asc" }, { fullName: "asc" }],
      include: {
        roles: { include: { role: true } },
        doctorProfile: {
          include: {
            department: canViewDepts
              ? true
              : { select: { id: true, code: true, name: true, color: true } },
            _count: { select: { leadCases: true, assignedCases: true } },
          },
        },
        nurseProfile: {
          include: {
            department: canViewDepts
              ? true
              : { select: { id: true, code: true, name: true, color: true } },
          },
        },
        adminProfile: true,
        financialProfile: true,
        patientProfile: {
          include: {
            _count: { select: { medicalCases: true, invoices: true } },
          },
        },
      },
    });

    const sanitized = users.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      phone: u.phone,
      avatarColor: u.avatarColor,
      profileType: u.profileType,
      isActive: u.isActive,
      roles: u.roles.map((r) => r.role),
      doctorProfile: u.doctorProfile,
      nurseProfile: u.nurseProfile,
      adminProfile: u.adminProfile,
      financialProfile: u.financialProfile,
      patientProfile: u.patientProfile,
    }));

    return NextResponse.json({
      profiles: sanitized,
      scope: canViewDirectory ? "DIRECTORY" : "OWN",
    });
  } catch (error) {
    console.error("Profiles GET error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des profils" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.PROFILES_MANAGE)) {
      return forbiddenResponse(PERMISSIONS.PROFILES_MANAGE);
    }

    const body = await request.json();
    const {
      fullName,
      email,
      password,
      phone,
      profileType,
      departmentId,
      specialty,
      grade,
      qualification,
      shift,
      position,
      office,
      title,
      billingUnit,
    } = body as Record<string, string>;

    if (!fullName?.trim() || !email?.trim() || !profileType) {
      return NextResponse.json(
        { error: "Nom, email et type de profil sont requis" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Cet email est déjà utilisé" },
        { status: 409 }
      );
    }

    const roleCodeMap: Record<string, string> = {
      DOCTOR: "ROLE_MEDECIN",
      NURSE: "ROLE_INFIRMIER",
      ADMIN: "ROLE_ADMIN",
      FINANCIAL: "ROLE_FINANCE",
      PATIENT: "ROLE_PATIENT",
    };

    const defaultRole = await prisma.role.findUnique({
      where: { code: roleCodeMap[profileType] || "ROLE_PATIENT" },
    });

    const firstDept =
      departmentId ||
      (await prisma.department.findFirst({ select: { id: true } }))?.id ||
      "";

    const randomCode = Math.floor(1000 + Math.random() * 9000);

    const created = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        passwordHash: hashPassword(password || "Ehospia@2026"),
        fullName: fullName.trim(),
        phone: phone?.trim() || null,
        avatarColor:
          profileType === "DOCTOR"
            ? "#0284c7"
            : profileType === "NURSE"
              ? "#0d9488"
              : profileType === "ADMIN"
                ? "#0f172a"
                : profileType === "FINANCIAL"
                  ? "#16a34a"
                  : "#e11d48",
        profileType,
        roles: defaultRole ? { create: [{ roleId: defaultRole.id }] } : undefined,
        ...(profileType === "DOCTOR"
          ? {
              doctorProfile: {
                create: {
                  departmentId: firstDept,
                  rppsNumber: `RPPS-1000${randomCode}99`,
                  specialty: specialty || "Médecine Polyvalente",
                  grade: grade || "Praticien Hospitalier",
                  availability: "DISPONIBLE",
                  bio: "Praticien hospitalier E-HOSPIA.",
                },
              },
            }
          : {}),
        ...(profileType === "NURSE"
          ? {
              nurseProfile: {
                create: {
                  departmentId: firstDept,
                  matricule: `IDE-2026-${randomCode}`,
                  shift: shift || "MATIN",
                  qualification:
                    qualification || "Infirmier(e) Diplômé(e) d'État",
                },
              },
            }
          : {}),
        ...(profileType === "ADMIN"
          ? {
              adminProfile: {
                create: {
                  matricule: `ADM-2026-${randomCode}`,
                  position: position || "Cadre Administratif",
                  office: office || "Bâtiment Direction",
                  scope: "Administration Hospitalière",
                },
              },
            }
          : {}),
        ...(profileType === "FINANCIAL"
          ? {
              financialProfile: {
                create: {
                  matricule: `FIN-2026-${randomCode}`,
                  title: title || "Gestionnaire Facturation",
                  billingUnit: billingUnit || "Service Financier",
                  authorizationLimit: 15000,
                },
              },
            }
          : {}),
        ...(profileType === "PATIENT"
          ? {
              patientProfile: {
                create: {
                  folderNumber: `DOS-2026-${randomCode}`,
                  nationalId: "En cours d'enregistrement",
                  birthDate: "1990-01-01",
                  gender: "Non précisé",
                  bloodType: "Inconnu",
                  allergies: "Aucune connue",
                  chronicConditions: "Aucune",
                  emergencyContactName: "À renseigner",
                  emergencyContactPhone: "À renseigner",
                  insuranceProvider: "CPAM",
                  insuranceNumber: "En cours",
                },
              },
            }
          : {}),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        profileType: true,
      },
    });

    return NextResponse.json({ user: created }, { status: 201 });
  } catch (error) {
    console.error("Profiles POST error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du profil" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) return unauthorizedResponse();

    const body = await request.json();
    const { targetUserId, availability, phone, bio, isActive } = body as {
      targetUserId: string;
      availability?: string;
      phone?: string;
      bio?: string;
      isActive?: boolean;
    };

    const isSelf = targetUserId === user.id;
    const canManage = hasPermission(user, PERMISSIONS.PROFILES_MANAGE);

    if (!isSelf && !canManage) {
      return forbiddenResponse(PERMISSIONS.PROFILES_MANAGE);
    }

    if (phone !== undefined || (isActive !== undefined && canManage)) {
      await prisma.user.update({
        where: { id: targetUserId },
        data: {
          ...(phone !== undefined ? { phone } : {}),
          ...(isActive !== undefined && canManage ? { isActive } : {}),
        },
      });
    }

    if (availability !== undefined || bio !== undefined) {
      await prisma.doctorProfile.updateMany({
        where: { userId: targetUserId },
        data: {
          ...(availability ? { availability } : {}),
          ...(bio !== undefined ? { bio } : {}),
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Profiles PATCH error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du profil" },
      { status: 500 }
    );
  }
}
