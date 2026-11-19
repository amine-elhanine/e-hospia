import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME, extractSessionToken } from "@/lib/rbac";

export async function POST(request: Request) {
  try {
    const token = extractSessionToken(request);
    if (token) {
      await prisma.session.deleteMany({ where: { token } });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      path: "/",
      maxAge: 0,
      sameSite: "lax",
    });
    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la déconnexion" },
      { status: 500 }
    );
  }
}
