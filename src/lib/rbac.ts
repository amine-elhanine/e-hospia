import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "./prisma";

export const SESSION_COOKIE_NAME = "ehospia_session";

export const PERMISSIONS = {
  DEPARTMENTS_VIEW: "departments.view",
  DEPARTMENTS_COMMUNICATE: "departments.communicate",
  DEPARTMENTS_TRANSFER: "departments.transfer",
  DEPARTMENTS_MANAGE: "departments.manage",
  FOLDER_VIEW_ALL: "folder.view_all",
  FOLDER_VIEW_OWN: "folder.view_own",
  CASE_CREATE: "case.create",
  CASE_EDIT: "case.edit",
  CASE_ASSIGN_DOCTOR: "case.assign_doctor",
  CLINICAL_NOTE_CREATE: "clinical_note.create",
  VITALS_RECORD: "vitals.record",
  PROFILES_VIEW_DIRECTORY: "profiles.view_directory",
  PROFILES_MANAGE: "profiles.manage",
  BILLING_VIEW_ALL: "billing.view_all",
  BILLING_VIEW_OWN: "billing.view_own",
  BILLING_MANAGE: "billing.manage",
  RBAC_MANAGE: "rbac.manage",
  AI_USE: "ai.use",
  AI_MANAGE: "ai.manage",
} as const;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(":");
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, "hex");
  if (derivedBuf.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derivedBuf, keyBuf);
}

export async function getUserWithPermissions(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
      doctorProfile: {
        include: { department: true },
      },
      nurseProfile: {
        include: { department: true },
      },
      adminProfile: true,
      financialProfile: true,
      patientProfile: true,
    },
  });

  if (!user || !user.isActive) return null;

  const permissionSet = new Set<string>();
  const roleCodes: string[] = [];
  const roleNames: string[] = [];

  for (const ur of user.roles) {
    roleCodes.push(ur.role.code);
    roleNames.push(ur.role.name);
    for (const rp of ur.role.permissions) {
      permissionSet.add(rp.permission.code);
    }
  }

  const effectivePermissions = Array.from(permissionSet);
  const canViewDepts = effectivePermissions.includes(PERMISSIONS.DEPARTMENTS_VIEW);

  // Strip hospital bed/capacity data from nested department if user lacks departments.view
  const stripDept = <
    T extends { id: string; code: string; name: string; color: string }
  >(
    d: T
  ) =>
    canViewDepts
      ? d
      : {
          id: d.id,
          code: d.code,
          name: d.name,
          color: d.color,
        };

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    avatarColor: user.avatarColor,
    profileType: user.profileType,
    isActive: user.isActive,
    roleCodes,
    roleNames,
    effectivePermissions,
    doctorProfile: user.doctorProfile
      ? {
          ...user.doctorProfile,
          department: stripDept(user.doctorProfile.department),
        }
      : null,
    nurseProfile: user.nurseProfile
      ? {
          ...user.nurseProfile,
          department: stripDept(user.nurseProfile.department),
        }
      : null,
    adminProfile: user.adminProfile,
    financialProfile: user.financialProfile,
    patientProfile: user.patientProfile,
  };
}

export type AuthUser = NonNullable<
  Awaited<ReturnType<typeof getUserWithPermissions>>
>;

export function parseCookie(
  cookieHeader: string | null,
  name: string
): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";").map((c) => c.trim());
  for (const part of parts) {
    if (part.startsWith(`${name}=`)) {
      return decodeURIComponent(part.slice(name.length + 1));
    }
  }
  return null;
}

export function extractSessionToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }
  return parseCookie(request.headers.get("cookie"), SESSION_COOKIE_NAME);
}

export async function getRequestUser(
  request: Request
): Promise<AuthUser | null> {
  const token = extractSessionToken(request);
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
  });
  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return getUserWithPermissions(session.userId);
}

export function hasPermission(
  user: AuthUser | null,
  permissionCode: string
): boolean {
  if (!user || !user.isActive) return false;
  return user.effectivePermissions.includes(permissionCode);
}

export function hasAnyPermission(
  user: AuthUser | null,
  permissionCodes: string[]
): boolean {
  if (!user || !user.isActive) return false;
  return permissionCodes.some((code) => user.effectivePermissions.includes(code));
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { error: "Authentification requise. Veuillez vous connecter." },
    { status: 401 }
  );
}

export function forbiddenResponse(permissionCode: string) {
  return NextResponse.json(
    {
      error: `Accès refusé : permission requise (${permissionCode})`,
      requiredPermission: permissionCode,
    },
    { status: 403 }
  );
}
