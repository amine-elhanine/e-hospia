# E-HOSPIA — Plateforme de Gestion Hospitalière & Coordination Inter-Services

**E-HOSPIA** est une application web full-stack (Next.js App Router, TypeScript, Tailwind CSS, Prisma ORM et SQLite) qui gère les différents départements hospitaliers, assure la communication et les transferts entre services, centralise les dossiers médicaux multi-médecins, gère la facturation, intègre un Assistant IA gouverné par l'Administration et applique un contrôle d'accès strict par rôles et permissions (**RBAC**).

---

## 1. Les 8 Départements Hospitaliers

| Code | Département | Rôle dans la plateforme |
| :--- | :--- | :--- |
| `URGENCE` | **Urgences** | Accueil, triage IOA et urgences médico-chirurgicales 24h/24 |
| `DECHOCAGE` | **Déchocage** | Salle d'accueil des urgences vitales (SAUV) et polytraumatisés |
| `REANIMATION` | **Réanimation** | Soins intensifs polyvalents et surveillance continue |
| `PSYCHIATRIE` | **Psychiatrie** | Psychiatrie de liaison, urgences psychiatriques et suivi périnatal |
| `PEDIATRIE` | **Pédiatrie** | Hospitalisation pédiatrique générale et urgences infantiles |
| `GYNECOLOGIE` | **Gynécologie** | Chirurgie gynécologique et urgences pelviennes |
| `MATERNITE` | **Maternité** | Obstétrique, grossesses à haut risque et salles de naissance |
| `NEONAT` | **Néonatologie** | Réanimation néonatale, couveuses et soins intensifs du nouveau-né |

---

## 2. Comptes Utilisateurs, Emails, Mots de Passe & Rôles

Tous les utilisateurs doivent s'authentifier via l'écran de connexion (**email + mot de passe**). Les sessions sont stockées en base SQLite (`Session`) via cookie `HttpOnly` (`ehospia_session`).

### Administration & Gouvernance
| Nom complet | Email | Mot de passe | Profil | Rôle(s) | Périmètre |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Hélène Valéry** | `admin@e-hospia.fr` | `Admin@2026` | `ADMIN` | `ROLE_ADMIN` | Direction Générale, capacité des 8 services, annuaire, RBAC & Paramètres IA |

### Médecins & Chefs de Service
| Nom complet | Email | Mot de passe | Profil | Rôle(s) | Département principal |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Dr. Karim Mansouri** | `dr.mansouri@e-hospia.fr` | `Mansouri@2026` | `DOCTOR` | `ROLE_CHEF_SERVICE` + `ROLE_MEDECIN` | Urgences & Déchocage |
| **Dr. Mehdi Benali** | `dr.benali@e-hospia.fr` | `Benali@2026` | `DOCTOR` | `ROLE_CHEF_SERVICE` + `ROLE_MEDECIN` | Réanimation |
| **Dr. Sophie Laurent** | `dr.laurent@e-hospia.fr` | `Laurent@2026` | `DOCTOR` | `ROLE_MEDECIN` | Maternité |
| **Dr. Claire Moreau** | `dr.moreau@e-hospia.fr` | `Moreau@2026` | `DOCTOR` | `ROLE_MEDECIN` | Néonatologie & Pédiatrie |
| **Dr. Antoine Garnier** | `dr.garnier@e-hospia.fr` | `Garnier@2026` | `DOCTOR` | `ROLE_MEDECIN` | Psychiatrie |
| **Dr. Nadia Khelifi** | `dr.khelifi@e-hospia.fr` | `Khelifi@2026` | `DOCTOR` | `ROLE_MEDECIN` | Gynécologie |

### Équipe Infirmière
| Nom complet | Email | Mot de passe | Profil | Rôle(s) | Département & Poste |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Inf. Nadia Haddad** | `inf.haddad@e-hospia.fr` | `Haddad@2026` | `NURSE` | `ROLE_INFIRMIER` | Déchocage (Matin) |
| **Inf. Julie Chevalier** | `inf.chevalier@e-hospia.fr` | `Chevalier@2026` | `NURSE` | `ROLE_INFIRMIER` | Maternité (Après-midi) |
| **Inf. Thomas Petit** | `inf.petit@e-hospia.fr` | `Petit@2026` | `NURSE` | `ROLE_INFIRMIER` | Réanimation (Nuit) |

### Personnel Financier
| Nom complet | Email | Mot de passe | Profil | Rôle(s) | Unité |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **M. Rachid El Amrani** | `finance@e-hospia.fr` | `Finance@2026` | `FINANCIAL` | `ROLE_FINANCE` | Facturation & Tiers-Payant |

### Patients (Portail Patient Confidentiel)
| Nom complet | Email | Mot de passe | Profil | Rôle(s) | Dossier Médical |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Mme. Yasmine Alaoui** | `yasmine.alaoui@patient.fr` | `Yasmine@2026` | `PATIENT` | `ROLE_PATIENT` | `DOS-2026-001` (3 cas simultanés : Maternité, Urgences, Psychiatrie) |
| **M. Lucas Fernandez** | `lucas.fernandez@patient.fr` | `Lucas@2026` | `PATIENT` | `ROLE_PATIENT` | `DOS-2026-002` (2 cas simultanés : Réanimation, Psychiatrie) |
| **Enfant Léo Dubois (4 ans)** | `leo.dubois@patient.fr` | `Leo@2026` | `PATIENT` | `ROLE_PATIENT` | `DOS-2026-003` (Pédiatrie) |
| **Nouveau-né Adam Martin** | `bebe.martin@patient.fr` | `Adam@2026` | `PATIENT` | `ROLE_PATIENT` | `DOS-2026-004` (Néonatologie) |

*(Note : lors de la création d'un nouveau profil par l'Administration depuis l'interface, le mot de passe saisi est enregistré ; s'il est laissé vide, le mot de passe par défaut est `Ehospia@2026` pour le personnel ou `Patient@2026` pour un patient).*

---

## 3. Rôles & Permissions RBAC (19 Permissions)

* **`ROLE_ADMIN`** (`9/19`) : `departments.view`, `departments.manage`, `departments.communicate`, `profiles.view_directory`, `profiles.manage`, `billing.view_all`, `rbac.manage`, `ai.use`, `ai.manage` *(sans accès aux dossiers médicaux cliniques — secret médical)*.
* **`ROLE_CHEF_SERVICE`** (`12/19`) : `departments.view`, `departments.manage`, `departments.communicate`, `departments.transfer`, `folder.view_all`, `case.create`, `case.edit`, `case.assign_doctor`, `clinical_note.create`, `vitals.record`, `profiles.view_directory`, `ai.use`.
* **`ROLE_MEDECIN`** (`11/19`) : `departments.view`, `departments.communicate`, `departments.transfer`, `folder.view_all`, `case.create`, `case.edit`, `case.assign_doctor`, `clinical_note.create`, `vitals.record`, `profiles.view_directory`, `ai.use`.
* **`ROLE_INFIRMIER`** (`7/19`) : `departments.view`, `departments.communicate`, `folder.view_all`, `clinical_note.create`, `vitals.record`, `profiles.view_directory`, `ai.use` *(observations infirmières et constantes uniquement ; pas de diagnostic ni prescription)*.
* **`ROLE_FINANCE`** (`3/19`) : `billing.view_all`, `billing.manage`, `ai.use` *(sans accès à la capacité des services ni aux dossiers médicaux)*.
* **`ROLE_PATIENT`** (`3/19`) : `folder.view_own`, `billing.view_own`, `ai.use` *(accès strictement limité à son propre dossier médical, ses médecins et ses factures ; aucun accès à la capacité en lits de l'hôpital)*.

---

## 4. Installation & Lancement

```bash
# 1. Installer les dépendances
npm install

# 2. Générer le client Prisma et créer la base SQLite (prisma/dev.db)
npx prisma generate
npx prisma db push

# 3. Initialiser les données et comptes utilisateurs
npm run db:seed

# 4. Lancer le serveur de développement (ou build + start)
npm run dev
```

L'application est accessible sur `http://localhost:3000`.
