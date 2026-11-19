import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE_NAME,
  getUserWithPermissions,
  verifyPassword,
} from "@/lib/rbac";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body as {
      email?: string;
      password?: string;
    };

    if (!email?.trim() || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe sont obligatoires" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json(
        { error: "Email ou mot de passe incorrect" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Ce compte est désactivé. Contactez l'Administration." },
        { status: 403 }
      );
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days

    await prisma.session.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    const fullUser = await getUserWithPermissions(user.id);
    if (!fullUser) {
      return NextResponse.json(
        { error: "Profil utilisateur introuvable" },
        { status: 404 }
      );
    }

    const response = NextResponse.json({ user: fullUser });
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    });
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la connexion" },
      { status: 500 }
    );
  }
}
