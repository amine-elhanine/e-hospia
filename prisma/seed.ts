import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

async function main() {
  console.log("Initialisation de la base de données SQLite E-HOSPIA...");

  await prisma.session.deleteMany();
  await prisma.aiSetting.deleteMany();
  await prisma.aiModel.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.departmentTransfer.deleteMany();
  await prisma.departmentMessage.deleteMany();
  await prisma.vitalSignLog.deleteMany();
  await prisma.clinicalNote.deleteMany();
  await prisma.caseDoctorAssignment.deleteMany();
  await prisma.medicalCase.deleteMany();
  await prisma.patientProfile.deleteMany();
  await prisma.financialProfile.deleteMany();
  await prisma.adminProfile.deleteMany();
  await prisma.nurseProfile.deleteMany();
  await prisma.doctorProfile.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.department.deleteMany();

  // 1. 8 Hospital Departments
  const departmentsData = [
    {
      code: "URGENCE",
      name: "Urgences",
      description:
        "Accueil, triage IOA et prise en charge des urgences médico-chirurgicales 24h/24.",
      floor: "Rez-de-chaussée — Aile Nord",
      phoneExtension: "1100",
      totalBeds: 28,
      occupiedBeds: 22,
      alertLevel: "TENSION",
      color: "#ef4444",
    },
    {
      code: "DECHOCAGE",
      name: "Déchocage",
      description:
        "Salle d'accueil des urgences vitales (SAUV) et stabilisation immédiate des polytraumatisés.",
      floor: "Rez-de-chaussée — Zone Rouge",
      phoneExtension: "1105",
      totalBeds: 8,
      occupiedBeds: 5,
      alertLevel: "CRITIQUE",
      color: "#dc2626",
    },
    {
      code: "REANIMATION",
      name: "Réanimation",
      description:
        "Soins intensifs polyvalents, ventilation mécanique et surveillance continue des défaillances d'organes.",
      floor: "1er Étage — Aile Critique",
      phoneExtension: "1200",
      totalBeds: 18,
      occupiedBeds: 14,
      alertLevel: "TENSION",
      color: "#f97316",
    },
    {
      code: "PSYCHIATRIE",
      name: "Psychiatrie",
      description:
        "Psychiatrie de liaison, urgences psychiatriques, accompagnement périnatal et suivi post-traumatique.",
      floor: "2e Étage — Aile Est",
      phoneExtension: "1300",
      totalBeds: 24,
      occupiedBeds: 15,
      alertLevel: "NORMAL",
      color: "#8b5cf6",
    },
    {
      code: "PEDIATRIE",
      name: "Pédiatrie",
      description:
        "Hospitalisation pédiatrique générale, urgences infantiles et pathologies respiratoires de l'enfant.",
      floor: "3e Étage — Aile Sud",
      phoneExtension: "1400",
      totalBeds: 30,
      occupiedBeds: 19,
      alertLevel: "NORMAL",
      color: "#0ea5e9",
    },
    {
      code: "GYNECOLOGIE",
      name: "Gynécologie",
      description:
        "Chirurgie gynécologique, urgences pelviennes, suivi des pathologies gynécologiques complexes.",
      floor: "4e Étage — Aile Ouest",
      phoneExtension: "1500",
      totalBeds: 20,
      occupiedBeds: 11,
      alertLevel: "NORMAL",
      color: "#ec4899",
    },
    {
      code: "MATERNITE",
      name: "Maternité",
      description:
        "Obstétrique, grossesses à haut risque, salles de naissance et suites de couches.",
      floor: "4e Étage — Aile Sud",
      phoneExtension: "1550",
      totalBeds: 26,
      occupiedBeds: 18,
      alertLevel: "NORMAL",
      color: "#f43f5e",
    },
    {
      code: "NEONAT",
      name: "Néonatologie",
      description:
        "Réanimation néonatale, couveuses pour prématurés et soins intensifs du nouveau-né.",
      floor: "4e Étage — Unité Protégée",
      phoneExtension: "1580",
      totalBeds: 16,
      occupiedBeds: 12,
      alertLevel: "TENSION",
      color: "#14b8a6",
    },
  ];

  const departments: Record<string, { id: string; code: string; name: string }> =
    {};
  for (const d of departmentsData) {
    const created = await prisma.department.create({ data: d });
    departments[d.code] = created;
  }

  // 2. 19 Granular Permissions across 7 Categories
  const permissionsData = [
    {
      code: "departments.view",
      name: "Voir les départements",
      category: "DEPARTEMENTS",
      description:
        "Consulter la liste des 8 départements, leur capacité en lits et niveau d'alerte.",
    },
    {
      code: "departments.communicate",
      name: "Communication inter-services",
      category: "DEPARTEMENTS",
      description:
        "Envoyer des messages, demandes d'avis spécialisé et alertes entre départements.",
    },
    {
      code: "departments.transfer",
      name: "Transferts inter-services",
      category: "DEPARTEMENTS",
      description:
        "Initier, accepter ou refuser un transfert de patient entre départements.",
    },
    {
      code: "departments.manage",
      name: "Gérer les services",
      category: "DEPARTEMENTS",
      description:
        "Modifier la capacité en lits et le niveau d'alerte opérationnelle d'un service.",
    },
    {
      code: "folder.view_all",
      name: "Consulter tous les dossiers médicaux",
      category: "DOSSIER_MEDICAL",
      description:
        "Accéder aux dossiers médicaux complets des patients et à leurs cas actifs.",
    },
    {
      code: "folder.view_own",
      name: "Consulter son propre dossier",
      category: "DOSSIER_MEDICAL",
      description:
        "Permet au patient de consulter son profil, ses cas médicaux et ses médecins.",
    },
    {
      code: "case.create",
      name: "Ouvrir un cas médical",
      category: "DOSSIER_MEDICAL",
      description:
        "Créer un nouveau cas médical pour un problème de santé spécifique du patient.",
    },
    {
      code: "case.edit",
      name: "Modifier un cas médical",
      category: "DOSSIER_MEDICAL",
      description:
        "Mettre à jour le diagnostic, le statut, la priorité et le plan de traitement.",
    },
    {
      code: "case.assign_doctor",
      name: "Affecter des médecins spécialistes",
      category: "DOSSIER_MEDICAL",
      description:
        "Associer plusieurs médecins spécialistes en collaboration sur un cas médical.",
    },
    {
      code: "clinical_note.create",
      name: "Rédiger notes & prescriptions",
      category: "SOINS_CLINIQUES",
      description:
        "Ajouter des observations cliniques, examens et prescriptions médicales.",
    },
    {
      code: "vitals.record",
      name: "Saisir les constantes vitales",
      category: "SOINS_CLINIQUES",
      description:
        "Enregistrer la tension, fréquence cardiaque, SpO2 et température du patient.",
    },
    {
      code: "profiles.view_directory",
      name: "Consulter l'annuaire des profils",
      category: "PROFILS",
      description:
        "Voir les profils des médecins, infirmiers, administration, finance et patients.",
    },
    {
      code: "profiles.manage",
      name: "Gérer les profils hospitaliers",
      category: "PROFILS",
      description:
        "Créer ou mettre à jour les profils et disponibilités des acteurs hospitaliers.",
    },
    {
      code: "billing.view_all",
      name: "Voir toute la facturation",
      category: "FINANCES",
      description:
        "Accéder à l'ensemble des factures, prises en charge mutuelles et recettes.",
    },
    {
      code: "billing.view_own",
      name: "Voir ses propres factures",
      category: "FINANCES",
      description:
        "Permet au patient de consulter l'état de ses propres factures hospitalières.",
    },
    {
      code: "billing.manage",
      name: "Émettre et encaisser les factures",
      category: "FINANCES",
      description:
        "Créer des factures, valider les prises en charge et enregistrer les paiements.",
    },
    {
      code: "rbac.manage",
      name: "Gérer les rôles et permissions",
      category: "SECURITE_RBAC",
      description:
        "Configurer la matrice RBAC, créer des rôles et attribuer des rôles aux utilisateurs.",
    },
    {
      code: "ai.use",
      name: "Utiliser l'Assistant IA E-HOSPIA",
      category: "INTELLIGENCE_ARTIFICIELLE",
      description:
        "Interroger le modèle d'IA actif de l'hôpital dans le périmètre strict de ses permissions RBAC.",
    },
    {
      code: "ai.manage",
      name: "Configurer et ajouter des modèles IA (Admin)",
      category: "INTELLIGENCE_ARTIFICIELLE",
      description:
        "Ajouter des modèles IA, définir le modèle global actif et paramétrer le prompt système.",
    },
  ];

  const permissions: Record<string, string> = {};
  for (const p of permissionsData) {
    const created = await prisma.permission.create({ data: p });
    permissions[p.code] = created.id;
  }

  // 3. 6 Roles with Strict RBAC Permissions
  const rolesConfig = [
    {
      code: "ROLE_ADMIN",
      name: "Direction & Administration",
      description:
        "Pilotage général de l'hôpital, gestion des services, capacité en lits, annuaire, modèles IA et RBAC (hors secret médical clinique).",
      profileType: "ADMIN",
      perms: [
        "departments.view",
        "departments.communicate",
        "departments.manage",
        "profiles.view_directory",
        "profiles.manage",
        "billing.view_all",
        "rbac.manage",
        "ai.use",
        "ai.manage",
      ],
    },
    {
      code: "ROLE_CHEF_SERVICE",
      name: "Chef de Service Médical",
      description:
        "Coordination médicale d'un pôle, gestion de la capacité des lits et validation des transferts critiques.",
      profileType: "DOCTOR",
      perms: [
        "departments.view",
        "departments.communicate",
        "departments.transfer",
        "departments.manage",
        "folder.view_all",
        "case.create",
        "case.edit",
        "case.assign_doctor",
        "clinical_note.create",
        "vitals.record",
        "profiles.view_directory",
        "ai.use",
      ],
    },
    {
      code: "ROLE_MEDECIN",
      name: "Médecin Spécialiste",
      description:
        "Prise en charge des cas médicaux, prescriptions, coordination inter-services et dossiers patients.",
      profileType: "DOCTOR",
      perms: [
        "departments.view",
        "departments.communicate",
        "departments.transfer",
        "folder.view_all",
        "case.create",
        "case.edit",
        "case.assign_doctor",
        "clinical_note.create",
        "vitals.record",
        "profiles.view_directory",
        "ai.use",
      ],
    },
    {
      code: "ROLE_INFIRMIER",
      name: "Infirmier(e) Diplômé(e) d'État",
      description:
        "Soins infirmiers, relevé des constantes vitales, consultation des dossiers et suivi de la capacité en lits des services.",
      profileType: "NURSE",
      perms: [
        "departments.view",
        "departments.communicate",
        "folder.view_all",
        "clinical_note.create",
        "vitals.record",
        "profiles.view_directory",
        "ai.use",
      ],
    },
    {
      code: "ROLE_FINANCE",
      name: "Cadre Financier & Facturation",
      description:
        "Gestion des factures hospitalières, couvertures assurance/mutuelle et encaissements (sans accès clinique ni capacité des services).",
      profileType: "FINANCIAL",
      perms: ["billing.view_all", "billing.manage", "ai.use"],
    },
    {
      code: "ROLE_PATIENT",
      name: "Portail Patient",
      description:
        "Accès personnel confidentiel à son propre dossier médical, ses médecins et ses factures (aucun accès aux données de l'hôpital).",
      profileType: "PATIENT",
      perms: ["folder.view_own", "billing.view_own", "ai.use"],
    },
  ];

  const roles: Record<string, string> = {};
  for (const r of rolesConfig) {
    const createdRole = await prisma.role.create({
      data: {
        code: r.code,
        name: r.name,
        description: r.description,
        profileType: r.profileType,
      },
    });
    roles[r.code] = createdRole.id;
    for (const permCode of r.perms) {
      await prisma.rolePermission.create({
        data: {
          roleId: createdRole.id,
          permissionId: permissions[permCode],
        },
      });
    }
  }

  // 4. Create 15 Authenticated Users with Unique Passwords
  await prisma.user.create({
    data: {
      email: "admin@e-hospia.fr",
      passwordHash: hashPassword("Admin@2026"),
      fullName: "Hélène Valéry",
      phone: "+33 1 45 20 10 01",
      avatarColor: "#0f172a",
      profileType: "ADMIN",
      adminProfile: {
        create: {
          matricule: "ADM-2019-001",
          position: "Directrice Générale & Administratrice RBAC",
          office: "Bâtiment Direction — Bureau 101",
          scope: "Gouvernance globale des 8 départements & Habilitations",
        },
      },
      roles: {
        create: [{ roleId: roles["ROLE_ADMIN"] }],
      },
    },
  });

  const drMansouriUser = await prisma.user.create({
    data: {
      email: "dr.mansouri@e-hospia.fr",
      passwordHash: hashPassword("Mansouri@2026"),
      fullName: "Dr. Karim Mansouri",
      phone: "+33 1 45 20 11 02",
      avatarColor: "#dc2626",
      profileType: "DOCTOR",
      doctorProfile: {
        create: {
          departmentId: departments["URGENCE"].id,
          rppsNumber: "RPPS-10004582101",
          specialty: "Médecine d'Urgence & Déchocage",
          grade: "Chef de Pôle Urgences / Déchocage",
          availability: "DE_GARDE",
          bio: "Responsable de la coordination entre les Urgences, le Déchocage et la Réanimation.",
        },
      },
      roles: {
        create: [
          { roleId: roles["ROLE_CHEF_SERVICE"] },
          { roleId: roles["ROLE_MEDECIN"] },
        ],
      },
    },
    include: { doctorProfile: true },
  });

  const drLaurentUser = await prisma.user.create({
    data: {
      email: "dr.laurent@e-hospia.fr",
      passwordHash: hashPassword("Laurent@2026"),
      fullName: "Dr. Sophie Laurent",
      phone: "+33 1 45 20 15 51",
      avatarColor: "#ec4899",
      profileType: "DOCTOR",
      doctorProfile: {
        create: {
          departmentId: departments["MATERNITE"].id,
          rppsNumber: "RPPS-10004582102",
          specialty: "Gynécologie-Obstétrique",
          grade: "Praticien Hospitalier",
          availability: "DISPONIBLE",
          bio: "Spécialiste des grossesses gémellaires et pathologies obstétricales à haut risque.",
        },
      },
      roles: {
        create: [{ roleId: roles["ROLE_MEDECIN"] }],
      },
    },
    include: { doctorProfile: true },
  });

  const drBenaliUser = await prisma.user.create({
    data: {
      email: "dr.benali@e-hospia.fr",
      passwordHash: hashPassword("Benali@2026"),
      fullName: "Dr. Mehdi Benali",
      phone: "+33 1 45 20 12 03",
      avatarColor: "#ea580c",
      profileType: "DOCTOR",
      doctorProfile: {
        create: {
          departmentId: departments["REANIMATION"].id,
          rppsNumber: "RPPS-10004582103",
          specialty: "Anesthésie-Réanimation",
          grade: "Chef de Service Réanimation",
          availability: "EN_INTERVENTION",
          bio: "Réanimateur polyvalent, référent pour les transferts critiques depuis le Déchocage.",
        },
      },
      roles: {
        create: [
          { roleId: roles["ROLE_CHEF_SERVICE"] },
          { roleId: roles["ROLE_MEDECIN"] },
        ],
      },
    },
    include: { doctorProfile: true },
  });

  const drMoreauUser = await prisma.user.create({
    data: {
      email: "dr.moreau@e-hospia.fr",
      passwordHash: hashPassword("Moreau@2026"),
      fullName: "Dr. Claire Moreau",
      phone: "+33 1 45 20 14 04",
      avatarColor: "#0284c7",
      profileType: "DOCTOR",
      doctorProfile: {
        create: {
          departmentId: departments["NEONAT"].id,
          rppsNumber: "RPPS-10004582104",
          specialty: "Pédiatrie & Néonatologie",
          grade: "Praticien Hospitalier",
          availability: "DISPONIBLE",
          bio: "Double compétence pédiatrie générale et réanimation néonatale.",
        },
      },
      roles: {
        create: [{ roleId: roles["ROLE_MEDECIN"] }],
      },
    },
    include: { doctorProfile: true },
  });

  const drGarnierUser = await prisma.user.create({
    data: {
      email: "dr.garnier@e-hospia.fr",
      passwordHash: hashPassword("Garnier@2026"),
      fullName: "Dr. Antoine Garnier",
      phone: "+33 1 45 20 13 05",
      avatarColor: "#7c3aed",
      profileType: "DOCTOR",
      doctorProfile: {
        create: {
          departmentId: departments["PSYCHIATRIE"].id,
          rppsNumber: "RPPS-10004582105",
          specialty: "Psychiatrie de Liaison & Périnatale",
          grade: "Praticien Hospitalier",
          availability: "DISPONIBLE",
          bio: "Intervient en liaison dans tous les services (Maternité, Réanimation, Pédiatrie).",
        },
      },
      roles: {
        create: [{ roleId: roles["ROLE_MEDECIN"] }],
      },
    },
    include: { doctorProfile: true },
  });

  const drKhelifiUser = await prisma.user.create({
    data: {
      email: "dr.khelifi@e-hospia.fr",
      passwordHash: hashPassword("Khelifi@2026"),
      fullName: "Dr. Nadia Khelifi",
      phone: "+33 1 45 20 15 10",
      avatarColor: "#db2777",
      profileType: "DOCTOR",
      doctorProfile: {
        create: {
          departmentId: departments["GYNECOLOGIE"].id,
          rppsNumber: "RPPS-10004582106",
          specialty: "Chirurgie Gynécologique",
          grade: "Praticien Hospitalier",
          availability: "DISPONIBLE",
          bio: "Prise en charge des urgences gynécologiques et chirurgie pelvienne.",
        },
      },
      roles: {
        create: [{ roleId: roles["ROLE_MEDECIN"] }],
      },
    },
    include: { doctorProfile: true },
  });

  const infHaddadUser = await prisma.user.create({
    data: {
      email: "inf.haddad@e-hospia.fr",
      passwordHash: hashPassword("Haddad@2026"),
      fullName: "Inf. Nadia Haddad",
      phone: "+33 1 45 20 11 40",
      avatarColor: "#0d9488",
      profileType: "NURSE",
      nurseProfile: {
        create: {
          departmentId: departments["DECHOCAGE"].id,
          matricule: "IDE-2021-104",
          shift: "MATIN",
          qualification: "IDE Urgences & Déchocage (IOA)",
        },
      },
      roles: {
        create: [{ roleId: roles["ROLE_INFIRMIER"] }],
      },
    },
  });

  await prisma.user.create({
    data: {
      email: "inf.chevalier@e-hospia.fr",
      passwordHash: hashPassword("Chevalier@2026"),
      fullName: "Inf. Julie Chevalier",
      phone: "+33 1 45 20 15 62",
      avatarColor: "#14b8a6",
      profileType: "NURSE",
      nurseProfile: {
        create: {
          departmentId: departments["MATERNITE"].id,
          matricule: "IDE-2022-219",
          shift: "APRES_MIDI",
          qualification: "Infirmière Puéricultrice Maternité / Néonat",
        },
      },
      roles: {
        create: [{ roleId: roles["ROLE_INFIRMIER"] }],
      },
    },
  });

  await prisma.user.create({
    data: {
      email: "inf.petit@e-hospia.fr",
      passwordHash: hashPassword("Petit@2026"),
      fullName: "Inf. Thomas Petit",
      phone: "+33 1 45 20 12 45",
      avatarColor: "#0891b2",
      profileType: "NURSE",
      nurseProfile: {
        create: {
          departmentId: departments["REANIMATION"].id,
          matricule: "IDE-2020-087",
          shift: "NUIT",
          qualification: "IDE Soins Intensifs & Réanimation",
        },
      },
      roles: {
        create: [{ roleId: roles["ROLE_INFIRMIER"] }],
      },
    },
  });

  const financeUser = await prisma.user.create({
    data: {
      email: "finance@e-hospia.fr",
      passwordHash: hashPassword("Finance@2026"),
      fullName: "M. Rachid El Amrani",
      phone: "+33 1 45 20 18 00",
      avatarColor: "#16a34a",
      profileType: "FINANCIAL",
      financialProfile: {
        create: {
          matricule: "FIN-2018-012",
          title: "Responsable Facturation & Tiers-Payant",
          billingUnit: "Direction Administrative et Financière",
          authorizationLimit: 50000,
        },
      },
      roles: {
        create: [{ roleId: roles["ROLE_FINANCE"] }],
      },
    },
  });

  const patientYasmine = await prisma.user.create({
    data: {
      email: "yasmine.alaoui@patient.fr",
      passwordHash: hashPassword("Yasmine@2026"),
      fullName: "Mme. Yasmine Alaoui",
      phone: "+33 6 12 45 78 90",
      avatarColor: "#e11d48",
      profileType: "PATIENT",
      patientProfile: {
        create: {
          folderNumber: "DOS-2026-001",
          nationalId: "2 92 05 75 114 028 45",
          birthDate: "1992-05-14",
          gender: "Féminin",
          bloodType: "A+",
          allergies: "Pénicilline (urticaire sévère), Latex léger",
          chronicConditions: "Hypothyroïdie substituée (Levothyrox 50µg)",
          emergencyContactName: "M. Samir Alaoui (Conjoint)",
          emergencyContactPhone: "+33 6 12 45 78 91",
          insuranceProvider: "MGEN / CPAM Paris",
          insuranceNumber: "MUT-75014-88921",
        },
      },
      roles: {
        create: [{ roleId: roles["ROLE_PATIENT"] }],
      },
    },
    include: { patientProfile: true },
  });

  const patientLucas = await prisma.user.create({
    data: {
      email: "lucas.fernandez@patient.fr",
      passwordHash: hashPassword("Lucas@2026"),
      fullName: "M. Lucas Fernandez",
      phone: "+33 6 54 89 12 33",
      avatarColor: "#2563eb",
      profileType: "PATIENT",
      patientProfile: {
        create: {
          folderNumber: "DOS-2026-002",
          nationalId: "1 87 11 69 204 019 12",
          birthDate: "1987-11-23",
          gender: "Masculin",
          bloodType: "O-",
          allergies: "Aucune allergie médicamenteuse connue",
          chronicConditions: "Asthme léger intermittent",
          emergencyContactName: "Mme. Elena Fernandez (Sœur)",
          emergencyContactPhone: "+33 6 54 89 12 34",
          insuranceProvider: "Harmonie Mutuelle",
          insuranceNumber: "HM-69002-44109",
        },
      },
      roles: {
        create: [{ roleId: roles["ROLE_PATIENT"] }],
      },
    },
    include: { patientProfile: true },
  });

  const patientLeo = await prisma.user.create({
    data: {
      email: "leo.dubois@patient.fr",
      passwordHash: hashPassword("Leo@2026"),
      fullName: "Enfant Léo Dubois (4 ans)",
      phone: "+33 6 77 31 09 44",
      avatarColor: "#0284c7",
      profileType: "PATIENT",
      patientProfile: {
        create: {
          folderNumber: "DOS-2026-003",
          nationalId: "1 22 03 75 108 044 89",
          birthDate: "2022-03-08",
          gender: "Masculin",
          bloodType: "B+",
          allergies: "Arachides",
          chronicConditions: "Terrain atopique",
          emergencyContactName: "Mme. Camille Dubois (Mère)",
          emergencyContactPhone: "+33 6 77 31 09 44",
          insuranceProvider: "Alan Santé",
          insuranceNumber: "ALN-2022-99812",
        },
      },
      roles: {
        create: [{ roleId: roles["ROLE_PATIENT"] }],
      },
    },
    include: { patientProfile: true },
  });

  const patientBebe = await prisma.user.create({
    data: {
      email: "bebe.martin@patient.fr",
      passwordHash: hashPassword("Adam@2026"),
      fullName: "Nouveau-né Adam Martin",
      phone: "+33 6 88 10 22 30",
      avatarColor: "#14b8a6",
      profileType: "PATIENT",
      patientProfile: {
        create: {
          folderNumber: "DOS-2026-004",
          nationalId: "1 26 11 75 112 001 07",
          birthDate: "2026-11-12",
          gender: "Masculin",
          bloodType: "O+",
          allergies: "Aucune identifiée",
          chronicConditions: "Prématurité modérée (33 SA + 4j)",
          emergencyContactName: "Mme. Clara Martin (Mère)",
          emergencyContactPhone: "+33 6 88 10 22 30",
          insuranceProvider: "CPAM / Rattachement Maternel",
          insuranceNumber: "CPAM-75-33219",
        },
      },
      roles: {
        create: [{ roleId: roles["ROLE_PATIENT"] }],
      },
    },
    include: { patientProfile: true },
  });

  const drMansouri = drMansouriUser.doctorProfile!;
  const drLaurent = drLaurentUser.doctorProfile!;
  const drBenali = drBenaliUser.doctorProfile!;
  const drMoreau = drMoreauUser.doctorProfile!;
  const drGarnier = drGarnierUser.doctorProfile!;
  const drKhelifi = drKhelifiUser.doctorProfile!;

  // 5. Medical Cases (Multi-Doctor & Concurrent Cases)
  const caseYasmine1 = await prisma.medicalCase.create({
    data: {
      caseNumber: "CAS-2026-101",
      patientId: patientYasmine.patientProfile!.id,
      departmentId: departments["MATERNITE"].id,
      leadDoctorId: drLaurent.id,
      title: "Suivi grossesse gémellaire à haut risque (34 SA)",
      problemCategory: "Obstétrique & Maternité",
      diagnosis:
        "Grossesse gémellaire monochoriale biamniotique avec menace d'accouchement prématuré",
      symptoms:
        "Contractions utérines irrégulières, col raccourci à 18 mm, œdèmes des membres inférieurs",
      treatmentPlan:
        "Repos strict hospitalier, maturation pulmonaire fœtale (Célestène), monitoring biquotidien et anticipation néonatale.",
      status: "EN_OBSERVATION",
      priority: "HAUTE",
      roomBed: "MAT-402-A",
      assignedDoctors: {
        create: [
          { doctorId: drLaurent.id, roleInCase: "Obstétricienne Référente" },
          {
            doctorId: drMoreau.id,
            roleInCase:
              "Néonatologue Consultant (Préparation accueil prématurés)",
          },
          {
            doctorId: drKhelifi.id,
            roleInCase: "Chirurgien Gynécologue de garde",
          },
        ],
      },
      clinicalNotes: {
        create: [
          {
            authorUserId: drLaurentUser.id,
            authorName: drLaurentUser.fullName,
            authorRole: "Médecin Spécialiste",
            noteType: "OBSERVATION",
            content:
              "Échographie de contrôle à 34 SA : bonne vitalité des deux jumeaux. Planification d'une concertation avec la Néonatologie.",
            prescriptionDetails:
              "Célestène 12mg IM x2 à 24h d'intervalle + Spasfon IV si contractions.",
          },
          {
            authorUserId: drMoreauUser.id,
            authorName: drMoreauUser.fullName,
            authorRole: "Médecin Spécialiste",
            noteType: "CONSEIL_SPECIALISTE",
            content:
              "2 couveuses pré-réservées en Néonatologie en cas de déclenchement précoce. Entretien d'information effectué avec la patiente.",
          },
        ],
      },
      vitalSignLogs: {
        create: [
          {
            recordedByName: "Inf. Julie Chevalier",
            bloodPressure: "135/85",
            heartRate: 88,
            temperature: 36.9,
            oxygenSaturation: 99,
            notes: "RCF jumeaux réactif et rassurant.",
          },
        ],
      },
    },
  });

  const caseYasmine2 = await prisma.medicalCase.create({
    data: {
      caseNumber: "CAS-2026-102",
      patientId: patientYasmine.patientProfile!.id,
      departmentId: departments["URGENCE"].id,
      leadDoctorId: drMansouri.id,
      title: "Poussée hypertensive gravidique & céphalées aiguës",
      problemCategory: "Urgence Cardiovasculaire / Pré-éclampsie",
      diagnosis:
        "Suspicion de pré-éclampsie modérée en cours de bilan biologique",
      symptoms:
        "Tension artérielle à 165/102 mmHg à l'admission, phosphènes transitoires, céphalées frontales",
      treatmentPlan:
        "Nicardipine (Loxen) IVSE titrée, bilan hépatique/rénal + protéinurie, surveillance scopée en lien avec Maternité.",
      status: "CRITIQUE",
      priority: "URGENCE_VITALE",
      roomBed: "URG-BOX-03",
      assignedDoctors: {
        create: [
          { doctorId: drMansouri.id, roleInCase: "Urgentiste Responsable" },
          { doctorId: drLaurent.id, roleInCase: "Co-suivi Obstétrical" },
        ],
      },
      clinicalNotes: {
        create: [
          {
            authorUserId: drMansouriUser.id,
            authorName: drMansouriUser.fullName,
            authorRole: "Chef de Service Médical",
            noteType: "PRESCRIPTION",
            content:
              "Stabilisation tensionnelle prioritaire avant retour en unité grossesses à haut risque.",
            prescriptionDetails:
              "Loxen IVSE 1 mg/h à adapter pour PAS < 150 mmHg. Bilan pré-éclampsie en urgence.",
          },
        ],
      },
      vitalSignLogs: {
        create: [
          {
            recordedByName: "Inf. Nadia Haddad",
            bloodPressure: "152/94",
            heartRate: 96,
            temperature: 37.1,
            oxygenSaturation: 98,
            notes: "Décroissance progressive de la PA sous Loxen.",
          },
        ],
      },
    },
  });

  const caseYasmine3 = await prisma.medicalCase.create({
    data: {
      caseNumber: "CAS-2026-103",
      patientId: patientYasmine.patientProfile!.id,
      departmentId: departments["PSYCHIATRIE"].id,
      leadDoctorId: drGarnier.id,
      title: "Accompagnement anxiété périnatale aiguë",
      problemCategory: "Psychiatrie de Liaison",
      diagnosis:
        "Trouble anxieux réactionnel lié à l'hospitalisation prolongée et risque de prématurité",
      symptoms:
        "Crises d'angoisse nocturnes, insomnie d'endormissement, hypervigilance",
      treatmentPlan:
        "Entretiens de soutien bihebdomadaires au lit de la patiente, relaxation guidée sans benzodiazépines.",
      status: "ACTIF",
      priority: "NORMALE",
      roomBed: "Liaison Maternité",
      assignedDoctors: {
        create: [{ doctorId: drGarnier.id, roleInCase: "Psychiatre Référent" }],
      },
      clinicalNotes: {
        create: [
          {
            authorUserId: drGarnierUser.id,
            authorName: drGarnierUser.fullName,
            authorRole: "Médecin Spécialiste",
            noteType: "OBSERVATION",
            content:
              "Patiente coopérante et rassurée après l'entretien conjoint avec l'équipe de néonatologie. Pas de traitement psychotrope nécessaire.",
          },
        ],
      },
    },
  });

  const caseLucas1 = await prisma.medicalCase.create({
    data: {
      caseNumber: "CAS-2026-201",
      patientId: patientLucas.patientProfile!.id,
      departmentId: departments["REANIMATION"].id,
      leadDoctorId: drBenali.id,
      title: "Polytraumatisme thoracique & crânien (Post-Déchocage)",
      problemCategory: "Traumatologie & Réanimation",
      diagnosis:
        "Contusion pulmonaire bilatérale + fracture de 3 côtes + traumatisme crânien modéré",
      symptoms:
        "Hypoxémie initiale corrigée sous VNI, douleur thoracique intense, agitation post-traumatique",
      treatmentPlan:
        "Ventilation non invasive (VNI), analgésie multimodale PCA Morphine, TDM cérébral de contrôle à H24.",
      status: "CRITIQUE",
      priority: "URGENCE_VITALE",
      roomBed: "REA-LIT-07",
      assignedDoctors: {
        create: [
          { doctorId: drBenali.id, roleInCase: "Réanimateur Référent" },
          { doctorId: drMansouri.id, roleInCase: "Médecin Déchocage Initial" },
        ],
      },
      clinicalNotes: {
        create: [
          {
            authorUserId: drBenaliUser.id,
            authorName: drBenaliUser.fullName,
            authorRole: "Chef de Service Médical",
            noteType: "OBSERVATION",
            content:
              "Patient admis depuis le Déchocage après pose de drain thoracique droit. Hémodynamique stable sous surveillance continue.",
          },
        ],
      },
      vitalSignLogs: {
        create: [
          {
            recordedByName: "Inf. Thomas Petit",
            bloodPressure: "118/74",
            heartRate: 102,
            temperature: 37.4,
            oxygenSaturation: 95,
            notes: "Sous VNI FiO2 45%. Douleur évaluée à 3/10.",
          },
        ],
      },
    },
  });

  await prisma.medicalCase.create({
    data: {
      caseNumber: "CAS-2026-202",
      patientId: patientLucas.patientProfile!.id,
      departmentId: departments["PSYCHIATRIE"].id,
      leadDoctorId: drGarnier.id,
      title: "Évaluation stress post-traumatique post-accident",
      problemCategory: "Psychiatrie de Liaison",
      diagnosis: "État de stress aigu post-AVP",
      symptoms:
        "Cauchemars récurrents, flash-backs de l'accident, hyperréactivité",
      treatmentPlan: "Suivi psychothérapeutique dès sortie de réanimation.",
      status: "EN_OBSERVATION",
      priority: "NORMALE",
      assignedDoctors: {
        create: [
          { doctorId: drGarnier.id, roleInCase: "Psychiatre Consultant" },
        ],
      },
    },
  });

  const caseLeo1 = await prisma.medicalCase.create({
    data: {
      caseNumber: "CAS-2026-301",
      patientId: patientLeo.patientProfile!.id,
      departmentId: departments["PEDIATRIE"].id,
      leadDoctorId: drMoreau.id,
      title: "Détresse respiratoire aiguë sur bronchiolite sévère",
      problemCategory: "Pneumo-Pédiatrie",
      diagnosis: "Bronchiolite aiguë VRS+ avec tirage intercostal",
      symptoms: "Polypnée à 48/min, sibilants diffus, difficulté alimentaire",
      treatmentPlan:
        "Oxygénothérapie haut débit (Optiflow), désobstruction rhinopharyngée, hydratation IV.",
      status: "ACTIF",
      priority: "HAUTE",
      roomBed: "PED-CH-12",
      assignedDoctors: {
        create: [
          { doctorId: drMoreau.id, roleInCase: "Pédiatre Référente" },
          { doctorId: drBenali.id, roleInCase: "Avis Réanimation Pédiatrique" },
        ],
      },
      vitalSignLogs: {
        create: [
          {
            recordedByName: "Inf. Julie Chevalier",
            bloodPressure: "95/60",
            heartRate: 132,
            temperature: 38.2,
            oxygenSaturation: 96,
            notes: "Amélioration sous Optiflow.",
          },
        ],
      },
    },
  });

  await prisma.medicalCase.create({
    data: {
      caseNumber: "CAS-2026-401",
      patientId: patientBebe.patientProfile!.id,
      departmentId: departments["NEONAT"].id,
      leadDoctorId: drMoreau.id,
      title: "Surveillance prématurité & couveuse (33 SA + 4j)",
      problemCategory: "Néonatologie",
      diagnosis: "Prématurité modérée avec ictère néonatal simple",
      symptoms: "Immaturité de succion-déglutition, ictère cutané modéré",
      treatmentPlan:
        "Incubateur thermorégulé, photothérapie continue, nutrition entérale par sonde gastrique.",
      status: "ACTIF",
      priority: "HAUTE",
      roomBed: "NEO-COUVEUSE-04",
      assignedDoctors: {
        create: [{ doctorId: drMoreau.id, roleInCase: "Néonatologue Référente" }],
      },
    },
  });

  // 6. Inter-Department Messages
  await prisma.departmentMessage.createMany({
    data: [
      {
        fromDepartmentId: departments["URGENCE"].id,
        toDepartmentId: departments["MATERNITE"].id,
        senderUserId: drMansouriUser.id,
        senderName: drMansouriUser.fullName,
        senderRole: "Chef de Pôle Urgences",
        medicalCaseId: caseYasmine2.id,
        subject: "URGENT — Stabilisation TA Mme. Yasmine Alaoui",
        content:
          "Mme Alaoui (34 SA gémellaire) est actuellement sous Loxen IVSE en Box 3 des Urgences pour poussée à 165/102. Merci au Dr Laurent de confirmer le créneau de rapatriement en Maternité dès stabilisation < 145/90.",
        messageType: "ALERTE_URGENCE",
        priority: "CRITIQUE",
        status: "NON_LU",
      },
      {
        fromDepartmentId: departments["MATERNITE"].id,
        toDepartmentId: departments["NEONAT"].id,
        senderUserId: drLaurentUser.id,
        senderName: drLaurentUser.fullName,
        senderRole: "Obstétricienne",
        medicalCaseId: caseYasmine1.id,
        subject: "Pré-réservation 2 couveuses — Grossesse gémellaire Alaoui",
        content:
          "Maturation pulmonaire débutée ce jour à 34 SA. Risque d'extraction prématurée dans les 48-72h selon évolution tensionnelle. Pouvez-vous confirmer la disponibilité de 2 places en Néonatologie ?",
        messageType: "DISPONIBILITE_LIT",
        priority: "URGENTE",
        status: "TRAITE",
      },
      {
        fromDepartmentId: departments["DECHOCAGE"].id,
        toDepartmentId: departments["REANIMATION"].id,
        senderUserId: infHaddadUser.id,
        senderName: infHaddadUser.fullName,
        senderRole: "IDE Déchocage",
        medicalCaseId: caseLucas1.id,
        subject: "Transmission dossier biologique complet — Lucas Fernandez",
        content:
          "Les gaz du sang et le body-scanner de M. Fernandez ont été joints au dossier CAS-2026-201 avant son arrivée en Réa Lit 07.",
        messageType: "COORDINATION",
        priority: "NORMALE",
        status: "LU",
      },
      {
        fromDepartmentId: departments["PEDIATRIE"].id,
        toDepartmentId: departments["REANIMATION"].id,
        senderUserId: drMoreauUser.id,
        senderName: drMoreauUser.fullName,
        senderRole: "Pédiatre",
        medicalCaseId: caseLeo1.id,
        subject: "Demande d'avis Réa — Enfant Léo Dubois (Optiflow)",
        content:
          "Enfant de 4 ans sous Optiflow à 2L/kg/min, légère baisse de SpO2 à 93% lors des soins. Un réanimateur peut-il passer évaluer les critères de transfert éventuel ?",
        messageType: "AVIS_SPECIALISTE",
        priority: "URGENTE",
        status: "NON_LU",
      },
      {
        fromDepartmentId: departments["MATERNITE"].id,
        toDepartmentId: departments["PSYCHIATRIE"].id,
        senderUserId: drLaurentUser.id,
        senderName: drLaurentUser.fullName,
        senderRole: "Obstétricienne",
        medicalCaseId: caseYasmine3.id,
        subject:
          "Merci pour la prise en charge rapide en psychiatrie de liaison",
        content:
          "Mme Alaoui est nettement plus apaisée depuis le passage du Dr Garnier. Poursuivre le suivi conjoint.",
        messageType: "COORDINATION",
        priority: "NORMALE",
        status: "LU",
      },
    ],
  });

  // 7. Inter-Department Transfers
  await prisma.departmentTransfer.createMany({
    data: [
      {
        medicalCaseId: caseYasmine2.id,
        fromDepartmentId: departments["URGENCE"].id,
        toDepartmentId: departments["MATERNITE"].id,
        requestedByUserId: drMansouriUser.id,
        requestedByName: drMansouriUser.fullName,
        targetDoctorId: drLaurent.id,
        reason:
          "Retour vers l'unité Grossesses à Haut Risque après stabilisation tensionnelle",
        clinicalSummary:
          "TA stabilisée à 142/88 sous nicardipine orale de relais. Bilan biologique sans syndrome HELLP.",
        priority: "URGENTE",
        status: "EN_ATTENTE",
      },
      {
        medicalCaseId: caseLeo1.id,
        fromDepartmentId: departments["PEDIATRIE"].id,
        toDepartmentId: departments["REANIMATION"].id,
        requestedByUserId: drMoreauUser.id,
        requestedByName: drMoreauUser.fullName,
        targetDoctorId: drBenali.id,
        reason:
          "Surveillance rapprochée si majoration du travail respiratoire sous VNI/Optiflow",
        clinicalSummary:
          "Bronchiolite sévère à VRS, enfant de 4 ans, SpO2 95-96% sous Optiflow.",
        priority: "NORMALE",
        status: "EN_ATTENTE",
      },
      {
        medicalCaseId: caseLucas1.id,
        fromDepartmentId: departments["DECHOCAGE"].id,
        toDepartmentId: departments["REANIMATION"].id,
        requestedByUserId: drMansouriUser.id,
        requestedByName: drMansouriUser.fullName,
        targetDoctorId: drBenali.id,
        reason: "Poursuite de la réanimation post-polytraumatisme thoracique",
        clinicalSummary:
          "Drainage thoracique réalisé en SAUV, transfert effectué en Lit REA-07.",
        priority: "VITALE",
        status: "ACCEPTE",
        resolvedAt: new Date(),
      },
    ],
  });

  // 8. Financial Invoices
  await prisma.invoice.createMany({
    data: [
      {
        invoiceNumber: "FAC-2026-0891",
        patientId: patientYasmine.patientProfile!.id,
        medicalCaseId: caseYasmine1.id,
        departmentId: departments["MATERNITE"].id,
        description:
          "Hospitalisation Grossesse Haut Risque (4 jours) + Échographies spécialisées + Corticothérapie",
        totalAmount: 2850.0,
        insuranceCovered: 2565.0,
        patientResponsibility: 285.0,
        status: "PRISE_EN_CHARGE",
        handledByUserId: financeUser.id,
      },
      {
        invoiceNumber: "FAC-2026-0892",
        patientId: patientYasmine.patientProfile!.id,
        medicalCaseId: caseYasmine2.id,
        departmentId: departments["URGENCE"].id,
        description:
          "Passage Urgences SAUV + Monitoring cardiovasculaire + Bilan biologique complet",
        totalAmount: 640.0,
        insuranceCovered: 512.0,
        patientResponsibility: 128.0,
        status: "EN_ATTENTE",
        handledByUserId: financeUser.id,
      },
      {
        invoiceNumber: "FAC-2026-0893",
        patientId: patientLucas.patientProfile!.id,
        medicalCaseId: caseLucas1.id,
        departmentId: departments["REANIMATION"].id,
        description:
          "Forfait Réanimation Polyvalente (3 jours) + Body-Scanner + Drainage thoracique",
        totalAmount: 6420.0,
        insuranceCovered: 6420.0,
        patientResponsibility: 0.0,
        status: "PAYEE",
        handledByUserId: financeUser.id,
        paidAt: new Date(),
      },
      {
        invoiceNumber: "FAC-2026-0894",
        patientId: patientLeo.patientProfile!.id,
        medicalCaseId: caseLeo1.id,
        departmentId: departments["PEDIATRIE"].id,
        description:
          "Hospitalisation Pédiatrie + Oxygénothérapie haut débit Optiflow",
        totalAmount: 1180.0,
        insuranceCovered: 1062.0,
        patientResponsibility: 118.0,
        status: "EN_ATTENTE",
        handledByUserId: financeUser.id,
      },
    ],
  });

  // 9. AI Models & Settings
  await prisma.aiModel.createMany({
    data: [
      {
        id: "model-ehospia-clinical",
        name: "E-HOSPIA Clinical Copilot v2",
        provider: "LOCAL_DEMO",
        modelId: "ehospia-clinical-v2",
        endpoint: "local://ehospia-engine",
        apiKey: "",
        description:
          "Moteur clinique RBAC local fonctionnant directement sur SQLite sans clé API.",
        addedBy: "Système E-HOSPIA",
      },
      {
        id: "model-ollama-local",
        name: "Ollama Qwen 3.5 (4B Local)",
        provider: "OLLAMA_LOCAL",
        modelId: "qwen3.5:4b",
        endpoint: "http://localhost:11434/v1",
        apiKey: "",
        description:
          "Modèle souverain hébergé localement sur Ollama (http://localhost:11434) sans clé API.",
        addedBy: "Hélène Valéry",
      },
      {
        id: "model-gemini-flash",
        name: "Google Gemini 2.5 Flash",
        provider: "GOOGLE_GEMINI",
        modelId: "gemini-2.5-flash",
        endpoint: "https://generativelanguage.googleapis.com/v1beta",
        apiKey: "",
        description:
          "Modèle multimodal rapide Google Gemini pour la synthèse clinique et la coordination.",
        addedBy: "Hélène Valéry",
      },
      {
        id: "model-gpt-4o",
        name: "OpenAI GPT-4o Medical",
        provider: "OPENAI_COMPATIBLE",
        modelId: "gpt-4o",
        endpoint: "https://api.openai.com/v1",
        apiKey: "",
        description:
          "Modèle haute précision compatible OpenAI pour l'aide au diagnostic et la rédaction.",
        addedBy: "Hélène Valéry",
      },
    ],
  });

  await prisma.aiSetting.create({
    data: {
      id: "default",
      activeModelId: "model-ollama-local",
      hospitalSystemPrompt:
        "Vous êtes l'Assistant IA officiel d'E-HOSPIA. Respectez strictement le cloisonnement RBAC et le secret médical.",
      temperature: 0.2,
    },
  });

  console.log("Base de données SQLite E-HOSPIA initialisée avec succès !");
}

main()
  .catch((e) => {
    console.error("Erreur lors du seed :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
