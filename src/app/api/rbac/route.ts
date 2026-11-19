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
    if (!hasPermission(user, PERMISSIONS.RBAC_MANAGE)) {
      return forbiddenResponse(PERMISSIONS.RBAC_MANAGE);
    }

    const [roles, permissions, users] = await Promise.all([
      prisma.role.findMany({
        orderBy: { code: "asc" },
        include: {
          permissions: { include: { permission: true } },
          _count: { select: { users: true } },
        },
      }),
      prisma.permission.findMany({
        orderBy: [{ category: "asc" }, { code: "asc" }],
      }),
      prisma.user.findMany({
        orderBy: [{ profileType: "asc" }, { fullName: "asc" }],
        include: {
          roles: {
            include: {
              role: {
                include: {
                  permissions: { include: { permission: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    const formattedUsers = users.map((u) => {
      const permSet = new Set<string>();
      for (const ur of u.roles) {
        for (const rp of ur.role.permissions) {
          permSet.add(rp.permission.code);
        }
      }
      return {
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        profileType: u.profileType,
        avatarColor: u.avatarColor,
        isActive: u.isActive,
        roleIds: u.roles.map((r) => r.roleId),
        roles: u.roles.map((r) => ({
          id: r.role.id,
          code: r.role.code,
          name: r.role.name,
        })),
        effectivePermissions: Array.from(permSet),
      };
    });

    const formattedRoles = roles.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      profileType: r.profileType,
      userCount: r._count.users,
      permissionIds: r.permissions.map((p) => p.permissionId),
      permissionCodes: r.permissions.map((p) => p.permission.code),
    }));

    return NextResponse.json({
      roles: formattedRoles,
      permissions,
      users: formattedUsers,
    });
  } catch (error) {
    console.error("RBAC GET error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement de la matrice RBAC" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.RBAC_MANAGE)) {
      return forbiddenResponse(PERMISSIONS.RBAC_MANAGE);
    }

    const body = await request.json();
    const { name, description, profileType, permissionIds } = body as {
      name: string;
      description?: string;
      profileType: string;
      permissionIds?: string[];
    };

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Le nom du rôle est obligatoire" },
        { status: 400 }
      );
    }

    const code =
      "ROLE_" +
      name
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");

    const existing = await prisma.role.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json(
        { error: "Un rôle avec ce code existe déjà" },
        { status: 409 }
      );
    }

    const created = await prisma.role.create({
      data: {
        code,
        name: name.trim(),
        description: description?.trim() || "Rôle personnalisé E-HOSPIA",
        profileType: profileType || "DOCTOR",
        permissions: permissionIds?.length
          ? {
              create: permissionIds.map((pid) => ({ permissionId: pid })),
            }
          : undefined,
      },
    });

    return NextResponse.json({ role: created }, { status: 201 });
  } catch (error) {
    console.error("RBAC POST error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du rôle" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.RBAC_MANAGE)) {
      return forbiddenResponse(PERMISSIONS.RBAC_MANAGE);
    }

    const body = await request.json();
    const { action, roleId, permissionId, userId } = body as {
      action: "toggle_role_permission" | "toggle_user_role";
      roleId: string;
      permissionId?: string;
      userId?: string;
    };

    if (action === "toggle_role_permission" && roleId && permissionId) {
      const existing = await prisma.rolePermission.findUnique({
        where: { roleId_permissionId: { roleId, permissionId } },
      });
      if (existing) {
        await prisma.rolePermission.delete({ where: { id: existing.id } });
        return NextResponse.json({ enabled: false });
      } else {
        await prisma.rolePermission.create({
          data: { roleId, permissionId },
        });
        return NextResponse.json({ enabled: true });
      }
    }

    if (action === "toggle_user_role" && userId && roleId) {
      const existing = await prisma.userRole.findUnique({
        where: { userId_roleId: { userId, roleId } },
      });
      if (existing) {
        await prisma.userRole.delete({ where: { id: existing.id } });
        return NextResponse.json({ assigned: false });
      } else {
        await prisma.userRole.create({
          data: { userId, roleId },
        });
        return NextResponse.json({ assigned: true });
      }
    }

    return NextResponse.json({ error: "Action RBAC invalide" }, { status: 400 });
  } catch (error) {
    console.error("RBAC PATCH error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour RBAC" },
      { status: 500 }
    );
  }
}
