import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "E-HOSPIA — Plateforme Hospitalière & Coordination Inter-Services",
  description:
    "Gestion des 8 départements hospitaliers, dossiers médicaux multi-médecins, communication inter-services et contrôle d'accès RBAC.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
