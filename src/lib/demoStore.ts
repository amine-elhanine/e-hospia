import initialData from "@/data/ehospia-data.json";
import {
  AiModelConfig,
  AiPublicConfig,
  AiSettings,
  AuthUser,
  DepartmentSummary,
  PermissionItem,
} from "@/types/ehospia";

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

export interface RawRole {
  id: string;
  code: string;
  name: string;
  description: string;
  profileType: string;
  permissionIds: string[];
}

export interface RawUser {
  id: string;
  email: string;
  password: string;
  fullName: string;
  phone?: string | null;
  avatarColor: string;
  profileType: string;
  isActive: boolean;
  roleIds: string[];
  adminProfile?: {
    id: string;
    matricule: string;
    position: string;
    office: string;
    scope: string;
  } | null;
  doctorProfile?: {
    id: string;
    departmentId: string;
    rppsNumber: string;
    specialty: string;
    grade: string;
    availability: string;
    bio: string;
  } | null;
  nurseProfile?: {
    id: string;
    departmentId: string;
    matricule: string;
    shift: string;
    qualification: string;
  } | null;
  financialProfile?: {
    id: string;
    matricule: string;
    title: string;
    billingUnit: string;
    authorizationLimit: number;
  } | null;
  patientProfile?: {
    id: string;
    folderNumber: string;
    nationalId: string;
    birthDate: string;
    gender: string;
    bloodType: string;
    allergies: string;
    chronicConditions: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    insuranceProvider: string;
    insuranceNumber: string;
  } | null;
}

export interface RawMedicalCase {
  id: string;
  caseNumber: string;
  patientId: string;
  departmentId: string;
  leadDoctorId: string;
  title: string;
  problemCategory: string;
  diagnosis: string;
  symptoms: string;
  treatmentPlan: string;
  status: string;
  priority: string;
  roomBed?: string | null;
  openedAt: string;
  closedAt?: string | null;
  assignedDoctors: Array<{
    id: string;
    doctorId: string;
    roleInCase: string;
  }>;
  clinicalNotes: Array<{
    id: string;
    authorUserId: string;
    authorName: string;
    authorRole: string;
    noteType: string;
    content: string;
    prescriptionDetails?: string | null;
    createdAt: string;
  }>;
  vitalSignLogs: Array<{
    id: string;
    recordedByName: string;
    bloodPressure: string;
    heartRate: number;
    temperature: number;
    oxygenSaturation: number;
    notes?: string | null;
    recordedAt: string;
  }>;
}

export interface RawMessage {
  id: string;
  fromDepartmentId: string;
  toDepartmentId: string;
  senderUserId: string;
  senderName: string;
  senderRole: string;
  medicalCaseId?: string | null;
  subject: string;
  content: string;
  messageType: string;
  priority: string;
  status: string;
  createdAt: string;
}

export interface RawTransfer {
  id: string;
  medicalCaseId: string;
  fromDepartmentId: string;
  toDepartmentId: string;
  requestedByUserId: string;
  requestedByName: string;
  targetDoctorId?: string | null;
  reason: string;
  clinicalSummary: string;
  priority: string;
  status: string;
  createdAt: string;
  resolvedAt?: string | null;
}

export interface RawInvoice {
  id: string;
  invoiceNumber: string;
  patientId: string;
  medicalCaseId?: string | null;
  departmentId: string;
  description: string;
  totalAmount: number;
  insuranceCovered: number;
  patientResponsibility: number;
  status: string;
  handledByUserId?: string | null;
  issuedAt: string;
  paidAt?: string | null;
}

export interface EhospiaJsonDb {
  departments: DepartmentSummary[];
  permissions: PermissionItem[];
  roles: RawRole[];
  users: RawUser[];
  medicalCases: RawMedicalCase[];
  messages: RawMessage[];
  transfers: RawTransfer[];
  invoices: RawInvoice[];
  aiSettings: AiSettings;
}

const STORAGE_KEY = "ehospia_json_db_v1";

const DEPT_ORDER = [
  "URGENCE",
  "DECHOCAGE",
  "REANIMATION",
  "PSYCHIATRIE",
  "PEDIATRIE",
  "GYNECOLOGIE",
  "MATERNITE",
  "NEONAT",
];

function cloneInitialData(): EhospiaJsonDb {
  return JSON.parse(JSON.stringify(initialData)) as EhospiaJsonDb;
}

function ensureAiSchema(db: EhospiaJsonDb): EhospiaJsonDb {
  const defaults = cloneInitialData();
  let changed = false;

  if (!db.aiSettings || !Array.isArray(db.aiSettings.models)) {
    db.aiSettings = defaults.aiSettings;
    changed = true;
  }

  for (const defPerm of defaults.permissions) {
    if (!db.permissions.some((p) => p.code === defPerm.code)) {
      db.permissions.push(defPerm);
      changed = true;
    }
  }

  for (const role of db.roles) {
    if (
      !role.permissionIds.includes("perm-ai-use") &&
      defaults.roles.some(
        (dr) => dr.id === role.id && dr.permissionIds.includes("perm-ai-use")
      )
    ) {
      role.permissionIds.push("perm-ai-use");
      changed = true;
    }
    if (
      role.code === "ROLE_ADMIN" &&
      !role.permissionIds.includes("perm-ai-manage")
    ) {
      role.permissionIds.push("perm-ai-manage");
      changed = true;
    }
  }

  if (changed && typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      // Ignore storage quota errors
    }
  }
  return db;
}

let memoryStore: EhospiaJsonDb | null = null;

export function getStore(): EhospiaJsonDb {
  if (typeof window !== "undefined") {
    if (!memoryStore) {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          memoryStore = ensureAiSchema(JSON.parse(raw) as EhospiaJsonDb);
        }
      } catch {
        memoryStore = null;
      }
      if (!memoryStore) {
        memoryStore = cloneInitialData();
        saveStore(memoryStore);
      }
    }
    return memoryStore;
  }

  if (!memoryStore) {
    memoryStore = cloneInitialData();
  }
  return memoryStore;
}

function saveStore(db: EhospiaJsonDb) {
  memoryStore = db;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      // Ignore storage quota errors in demo mode
    }
  }
}

export function resetDemoJsonData(): EhospiaJsonDb {
  const fresh = cloneInitialData();
  saveStore(fresh);
  return fresh;
}

export function downloadDemoJsonData() {
  if (typeof window === "undefined") return;
  const db = getStore();
  const blob = new Blob([JSON.stringify(db, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ehospia-data.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function sortDepts(depts: DepartmentSummary[]) {
  return [...depts].sort(
    (a, b) => DEPT_ORDER.indexOf(a.code) - DEPT_ORDER.indexOf(b.code)
  );
}

function getDept(db: EhospiaJsonDb, deptId: string): DepartmentSummary {
  return (
    db.departments.find((d) => d.id === deptId) || {
      id: deptId,
      code: "UNKNOWN",
      name: "Service inconnu",
      description: "",
      floor: "",
      phoneExtension: "",
      totalBeds: 0,
      occupiedBeds: 0,
      alertLevel: "NORMAL",
      color: "#64748b",
    }
  );
}

function stripDeptCapacity(dept: DepartmentSummary): DepartmentSummary {
  return {
    id: dept.id,
    code: dept.code,
    name: dept.name,
    color: dept.color,
  } as DepartmentSummary;
}

function buildAuthUser(db: EhospiaJsonDb, userId?: string | null): AuthUser | null {
  let rawUser = userId ? db.users.find((u) => u.id === userId) : undefined;
  if (!rawUser) {
    rawUser =
      db.users.find((u) => u.email === "admin@e-hospia.fr") || db.users[0];
  }
  if (!rawUser) return null;

  const userRoles = rawUser.roleIds
    .map((rid) => db.roles.find((r) => r.id === rid))
    .filter((r): r is RawRole => Boolean(r));

  const permCodeSet = new Set<string>();
  for (const r of userRoles) {
    for (const pid of r.permissionIds) {
      const perm = db.permissions.find((p) => p.id === pid);
      if (perm) permCodeSet.add(perm.code);
    }
  }

  const effectivePermissions = Array.from(permCodeSet);
  const canViewDepts = effectivePermissions.includes(PERMISSIONS.DEPARTMENTS_VIEW);

  const mapDept = (deptId: string) => {
    const dept = getDept(db, deptId);
    return canViewDepts ? { ...dept } : stripDeptCapacity(dept);
  };

  return {
    id: rawUser.id,
    email: rawUser.email,
    fullName: rawUser.fullName,
    phone: rawUser.phone,
    avatarColor: rawUser.avatarColor,
    profileType: rawUser.profileType,
    isActive: rawUser.isActive,
    roleCodes: userRoles.map((r) => r.code),
    roleNames: userRoles.map((r) => r.name),
    effectivePermissions,
    doctorProfile: rawUser.doctorProfile
      ? {
          ...rawUser.doctorProfile,
          department: mapDept(rawUser.doctorProfile.departmentId),
        }
      : null,
    nurseProfile: rawUser.nurseProfile
      ? {
          ...rawUser.nurseProfile,
          department: mapDept(rawUser.nurseProfile.departmentId),
        }
      : null,
    adminProfile: rawUser.adminProfile ? { ...rawUser.adminProfile } : null,
    financialProfile: rawUser.financialProfile
      ? { ...rawUser.financialProfile }
      : null,
    patientProfile: rawUser.patientProfile ? { ...rawUser.patientProfile } : null,
  };
}

function hasPerm(user: AuthUser | null, code: string) {
  return Boolean(user && user.isActive && user.effectivePermissions.includes(code));
}

function hasAnyPerm(user: AuthUser | null, codes: string[]) {
  return Boolean(
    user &&
      user.isActive &&
      codes.some((c) => user.effectivePermissions.includes(c))
  );
}

function findDoctorByProfileId(db: EhospiaJsonDb, doctorProfileId: string) {
  const u = db.users.find((usr) => usr.doctorProfile?.id === doctorProfileId);
  if (!u || !u.doctorProfile) return null;
  return {
    ...u.doctorProfile,
    department: getDept(db, u.doctorProfile.departmentId),
    user: {
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      avatarColor: u.avatarColor,
    },
  };
}

function findPatientByProfileId(db: EhospiaJsonDb, patientProfileId: string) {
  const u = db.users.find((usr) => usr.patientProfile?.id === patientProfileId);
  if (!u || !u.patientProfile) return null;
  return {
    ...u.patientProfile,
    user: {
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      avatarColor: u.avatarColor,
      isActive: u.isActive,
    },
  };
}

function hydrateMedicalCase(db: EhospiaJsonDb, mc: RawMedicalCase) {
  const patient = findPatientByProfileId(db, mc.patientId);
  const leadDoctor = findDoctorByProfileId(db, mc.leadDoctorId);
  const department = getDept(db, mc.departmentId);

  return {
    ...mc,
    department,
    patient: patient || {
      id: mc.patientId,
      folderNumber: "DOS-?",
      user: { fullName: "Patient inconnu", avatarColor: "#64748b" },
    },
    leadDoctor: leadDoctor || {
      id: mc.leadDoctorId,
      specialty: "",
      grade: "",
      department,
      user: { fullName: "Médecin inconnu", email: "", avatarColor: "#64748b" },
    },
    assignedDoctors: mc.assignedDoctors.map((ad) => {
      const doc = findDoctorByProfileId(db, ad.doctorId);
      return {
        ...ad,
        doctor: doc || {
          id: ad.doctorId,
          specialty: "",
          grade: "",
          department,
          user: { fullName: "Médecin inconnu", email: "", avatarColor: "#64748b" },
        },
      };
    }),
    clinicalNotes: [...mc.clinicalNotes].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    vitalSignLogs: [...mc.vitalSignLogs].sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    ),
    transfers: db.transfers
      .filter((t) => t.medicalCaseId === mc.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((t) => ({
        ...t,
        fromDepartment: getDept(db, t.fromDepartmentId),
        toDepartment: getDept(db, t.toDepartmentId),
      })),
  };
}

export interface DemoResponse {
  ok: boolean;
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  json: () => Promise<any>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function jsonResp(data: any, status = 200): DemoResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => JSON.parse(JSON.stringify(data)),
  };
}

function forbiddenResp(permCode: string): DemoResponse {
  return jsonResp(
    {
      error: `Accès refusé : permission requise (${permCode})`,
      requiredPermission: permCode,
    },
    403
  );
}

export async function demoFetch(
  url: string,
  options?: RequestInit
): Promise<DemoResponse> {
  const db = getStore();
  const method = (options?.method || "GET").toUpperCase();
  const headers = new Headers(options?.headers || {});
  const storedUserId =
    typeof window !== "undefined"
      ? window.localStorage.getItem("ehospia_user_id")
      : null;
  const userIdHeader = headers.get("x-user-id") || storedUserId;
  const currentUser = buildAuthUser(db, userIdHeader);

  let body: Record<string, unknown> = {};
  if (typeof options?.body === "string" && options.body.trim()) {
    try {
      body = JSON.parse(options.body);
    } catch {
      body = {};
    }
  }

  const [pathPart, queryPart] = url.split("?");
  const searchParams = new URLSearchParams(queryPart || "");

  // ==================== /api/bootstrap ====================
  if (pathPart === "/api/bootstrap" && method === "GET") {
    const canViewDepts = hasPerm(currentUser, PERMISSIONS.DEPARTMENTS_VIEW);
    const canViewOwnFolder = hasPerm(currentUser, PERMISSIONS.FOLDER_VIEW_OWN);
    const canViewAllBilling = hasPerm(currentUser, PERMISSIONS.BILLING_VIEW_ALL);

    const departments = canViewDepts
      ? sortDepts(db.departments).map((dept) => ({
          ...dept,
          _count: {
            doctors: db.users.filter(
              (u) => u.doctorProfile?.departmentId === dept.id
            ).length,
            nurses: db.users.filter(
              (u) => u.nurseProfile?.departmentId === dept.id
            ).length,
            medicalCases: db.medicalCases.filter(
              (mc) => mc.departmentId === dept.id && mc.status !== "CLOTURE"
            ).length,
            incomingMessages: db.messages.filter(
              (m) => m.toDepartmentId === dept.id && m.status === "NON_LU"
            ).length,
            incomingTransfers: db.transfers.filter(
              (t) => t.toDepartmentId === dept.id && t.status === "EN_ATTENTE"
            ).length,
          },
        }))
      : [];

    const mapDeptOpt = (deptId: string) => {
      const dept = getDept(db, deptId);
      return canViewDepts ? { ...dept } : stripDeptCapacity(dept);
    };

    const allUsers = db.users
      .slice()
      .sort(
        (a, b) =>
          a.profileType.localeCompare(b.profileType) ||
          a.fullName.localeCompare(b.fullName)
      )
      .map((u) => ({
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        phone: u.phone,
        avatarColor: u.avatarColor,
        profileType: u.profileType,
        isActive: u.isActive,
        roles: u.roleIds
          .map((rid) => db.roles.find((r) => r.id === rid))
          .filter((r): r is RawRole => Boolean(r))
          .map((r) => ({ id: r.id, code: r.code, name: r.name })),
        doctorProfile: u.doctorProfile
          ? {
              ...u.doctorProfile,
              department: mapDeptOpt(u.doctorProfile.departmentId),
            }
          : null,
        nurseProfile: u.nurseProfile
          ? {
              ...u.nurseProfile,
              department: mapDeptOpt(u.nurseProfile.departmentId),
            }
          : null,
        adminProfile: u.adminProfile || null,
        financialProfile: u.financialProfile || null,
        patientProfile: u.patientProfile || null,
      }));

    let patientFolderSummary = null;
    if (canViewOwnFolder && currentUser?.patientProfile?.id) {
      const pid = currentUser.patientProfile.id;
      const myCases = db.medicalCases
        .filter((mc) => mc.patientId === pid)
        .sort(
          (a, b) =>
            new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime()
        )
        .map((mc) => {
          const dept = getDept(db, mc.departmentId);
          const leadDoc = findDoctorByProfileId(db, mc.leadDoctorId);
          return {
            id: mc.id,
            caseNumber: mc.caseNumber,
            title: mc.title,
            problemCategory: mc.problemCategory,
            status: mc.status,
            priority: mc.priority,
            roomBed: mc.roomBed,
            openedAt: mc.openedAt,
            department: { id: dept.id, name: dept.name, color: dept.color },
            leadDoctor: {
              specialty: leadDoc?.specialty || "",
              user: { fullName: leadDoc?.user.fullName || "" },
            },
            assignedDoctors: mc.assignedDoctors.map((ad) => {
              const doc = findDoctorByProfileId(db, ad.doctorId);
              return {
                roleInCase: ad.roleInCase,
                doctor: {
                  specialty: doc?.specialty || "",
                  user: { fullName: doc?.user.fullName || "" },
                  department: { name: doc?.department.name || "" },
                },
              };
            }),
            _count: {
              clinicalNotes: mc.clinicalNotes.length,
              vitalSignLogs: mc.vitalSignLogs.length,
            },
          };
        });

      const myInvoices = db.invoices
        .filter((inv) => inv.patientId === pid)
        .sort(
          (a, b) =>
            new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
        )
        .map((inv) => {
          const dept = getDept(db, inv.departmentId);
          return {
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            description: inv.description,
            totalAmount: inv.totalAmount,
            insuranceCovered: inv.insuranceCovered,
            patientResponsibility: inv.patientResponsibility,
            status: inv.status,
            issuedAt: inv.issuedAt,
            department: { name: dept.name, color: dept.color },
          };
        });

      patientFolderSummary = { medicalCases: myCases, invoices: myInvoices };
    }

    let billingSummary = null;
    if (canViewAllBilling) {
      billingSummary = {
        totalBilled: db.invoices.reduce((s, i) => s + i.totalAmount, 0),
        totalCovered: db.invoices.reduce((s, i) => s + i.insuranceCovered, 0),
        totalPatientResponsibility: db.invoices.reduce(
          (s, i) => s + i.patientResponsibility,
          0
        ),
        pendingCount: db.invoices.filter((i) => i.status === "EN_ATTENTE").length,
        paidCount: db.invoices.filter((i) => i.status === "PAYEE").length,
        invoiceCount: db.invoices.length,
      };
    }

    const canManageAi = hasPerm(currentUser, PERMISSIONS.AI_MANAGE);

    return jsonResp({
      currentUser,
      allUsers,
      departments,
      allPermissions: db.permissions,
      aiConfig: buildAiPublicConfig(db, canManageAi),
      roleContext: {
        patientFolderSummary,
        billingSummary,
      },
    });
  }

  // ==================== /api/auth/login ====================
  if (pathPart === "/api/auth/login" && method === "POST") {
    const { userId, email, password } = body as {
      userId?: string;
      email?: string;
      password?: string;
    };

    let targetId = userId;
    if (!targetId && email) {
      const found = db.users.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase()
      );
      if (!found || (password !== undefined && found.password !== password)) {
        return jsonResp({ error: "Identifiants incorrects" }, 401);
      }
      targetId = found.id;
    }

    if (!targetId) {
      return jsonResp(
        { error: "Veuillez sélectionner un utilisateur ou saisir un email" },
        400
      );
    }

    const exists = db.users.some((u) => u.id === targetId);
    if (!exists) {
      return jsonResp({ error: "Utilisateur introuvable" }, 404);
    }

    const fullUser = buildAuthUser(db, targetId);
    return jsonResp({ user: fullUser });
  }

  // ==================== /api/departments ====================
  if (pathPart === "/api/departments") {
    if (method === "GET") {
      if (!hasPerm(currentUser, PERMISSIONS.DEPARTMENTS_VIEW)) {
        return forbiddenResp(PERMISSIONS.DEPARTMENTS_VIEW);
      }
      const canViewAllFolders = hasPerm(currentUser, PERMISSIONS.FOLDER_VIEW_ALL);
      const ownPatientId = currentUser?.patientProfile?.id;

      const departments = sortDepts(db.departments).map((dept) => {
        const doctors = db.users
          .filter((u) => u.doctorProfile?.departmentId === dept.id)
          .map((u) => ({
            ...u.doctorProfile!,
            user: {
              id: u.id,
              fullName: u.fullName,
              email: u.email,
              phone: u.phone,
              avatarColor: u.avatarColor,
            },
          }));
        const nurses = db.users
          .filter((u) => u.nurseProfile?.departmentId === dept.id)
          .map((u) => ({
            ...u.nurseProfile!,
            user: {
              id: u.id,
              fullName: u.fullName,
              email: u.email,
              phone: u.phone,
              avatarColor: u.avatarColor,
            },
          }));

        const casesInDept = db.medicalCases
          .filter((mc) => {
            if (mc.departmentId !== dept.id) return false;
            if (canViewAllFolders) return true;
            if (ownPatientId) return mc.patientId === ownPatientId;
            return false;
          })
          .sort(
            (a, b) =>
              new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime()
          )
          .map((mc) => hydrateMedicalCase(db, mc));

        return {
          ...dept,
          doctors,
          nurses,
          medicalCases: casesInDept,
          _count: {
            medicalCases: db.medicalCases.filter(
              (mc) => mc.departmentId === dept.id && mc.status !== "CLOTURE"
            ).length,
            incomingMessages: db.messages.filter(
              (m) => m.toDepartmentId === dept.id && m.status === "NON_LU"
            ).length,
            incomingTransfers: db.transfers.filter(
              (t) => t.toDepartmentId === dept.id && t.status === "EN_ATTENTE"
            ).length,
          },
        };
      });

      return jsonResp({ departments });
    }

    if (method === "PATCH") {
      if (!hasPerm(currentUser, PERMISSIONS.DEPARTMENTS_MANAGE)) {
        return forbiddenResp(PERMISSIONS.DEPARTMENTS_MANAGE);
      }
      const { id, alertLevel, occupiedBeds, totalBeds, phoneExtension, description } =
        body as {
          id: string;
          alertLevel?: string;
          occupiedBeds?: number;
          totalBeds?: number;
          phoneExtension?: string;
          description?: string;
        };
      const dept = db.departments.find((d) => d.id === id);
      if (!dept) return jsonResp({ error: "Département introuvable" }, 404);

      const nextTotal =
        totalBeds !== undefined ? Math.max(1, Number(totalBeds)) : dept.totalBeds;
      const nextOccupied =
        occupiedBeds !== undefined
          ? Math.min(nextTotal, Math.max(0, Number(occupiedBeds)))
          : Math.min(nextTotal, dept.occupiedBeds);

      dept.alertLevel = alertLevel ?? dept.alertLevel;
      dept.totalBeds = nextTotal;
      dept.occupiedBeds = nextOccupied;
      if (phoneExtension !== undefined) dept.phoneExtension = phoneExtension;
      if (description !== undefined) dept.description = description;

      saveStore(db);
      return jsonResp({ department: dept });
    }
  }

  // ==================== /api/communications ====================
  if (pathPart === "/api/communications") {
    if (method === "GET") {
      if (
        !hasAnyPerm(currentUser, [
          PERMISSIONS.DEPARTMENTS_COMMUNICATE,
          PERMISSIONS.DEPARTMENTS_VIEW,
        ])
      ) {
        return forbiddenResp(PERMISSIONS.DEPARTMENTS_COMMUNICATE);
      }
      const deptFilter = searchParams.get("departmentId");
      const messages = db.messages
        .filter((m) =>
          deptFilter
            ? m.fromDepartmentId === deptFilter || m.toDepartmentId === deptFilter
            : true
        )
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .map((m) => {
          const mc = m.medicalCaseId
            ? db.medicalCases.find((c) => c.id === m.medicalCaseId)
            : null;
          const pat = mc ? findPatientByProfileId(db, mc.patientId) : null;
          return {
            ...m,
            fromDepartment: getDept(db, m.fromDepartmentId),
            toDepartment: getDept(db, m.toDepartmentId),
            medicalCase: mc
              ? {
                  id: mc.id,
                  caseNumber: mc.caseNumber,
                  title: mc.title,
                  patient: {
                    user: { fullName: pat?.user.fullName || "Patient" },
                  },
                }
              : null,
          };
        });
      return jsonResp({ messages });
    }

    if (method === "POST") {
      if (!hasPerm(currentUser, PERMISSIONS.DEPARTMENTS_COMMUNICATE)) {
        return forbiddenResp(PERMISSIONS.DEPARTMENTS_COMMUNICATE);
      }
      const {
        fromDepartmentId,
        toDepartmentId,
        medicalCaseId,
        subject,
        content,
        messageType,
        priority,
      } = body as Record<string, string>;

      if (!fromDepartmentId || !toDepartmentId || !subject?.trim() || !content?.trim()) {
        return jsonResp(
          { error: "Service émetteur, destinataire, objet et message sont requis" },
          400
        );
      }

      const created: RawMessage = {
        id: uid("msg"),
        fromDepartmentId,
        toDepartmentId,
        senderUserId: currentUser!.id,
        senderName: currentUser!.fullName,
        senderRole: currentUser!.roleNames.join(" / ") || currentUser!.profileType,
        medicalCaseId: medicalCaseId || null,
        subject: subject.trim(),
        content: content.trim(),
        messageType: messageType || "COORDINATION",
        priority: priority || "NORMALE",
        status: "NON_LU",
        createdAt: new Date().toISOString(),
      };
      db.messages.unshift(created);
      saveStore(db);
      return jsonResp({ message: created }, 201);
    }

    if (method === "PATCH") {
      if (!hasPerm(currentUser, PERMISSIONS.DEPARTMENTS_COMMUNICATE)) {
        return forbiddenResp(PERMISSIONS.DEPARTMENTS_COMMUNICATE);
      }
      const { id, status } = body as { id: string; status: string };
      const msg = db.messages.find((m) => m.id === id);
      if (!msg || !["NON_LU", "LU", "TRAITE"].includes(status)) {
        return jsonResp({ error: "Paramètres invalides" }, 400);
      }
      msg.status = status;
      saveStore(db);
      return jsonResp({ message: msg });
    }
  }

  // ==================== /api/transfers ====================
  if (pathPart === "/api/transfers") {
    if (method === "GET") {
      if (
        !hasAnyPerm(currentUser, [
          PERMISSIONS.DEPARTMENTS_TRANSFER,
          PERMISSIONS.DEPARTMENTS_VIEW,
        ])
      ) {
        return forbiddenResp(PERMISSIONS.DEPARTMENTS_TRANSFER);
      }
      const transfers = [...db.transfers]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .map((tr) => {
          const mc = db.medicalCases.find((c) => c.id === tr.medicalCaseId);
          const pat = mc ? findPatientByProfileId(db, mc.patientId) : null;
          const targetDoc = tr.targetDoctorId
            ? findDoctorByProfileId(db, tr.targetDoctorId)
            : null;
          return {
            ...tr,
            fromDepartment: getDept(db, tr.fromDepartmentId),
            toDepartment: getDept(db, tr.toDepartmentId),
            targetDoctor: targetDoc
              ? { user: { fullName: targetDoc.user.fullName } }
              : null,
            medicalCase: mc
              ? {
                  id: mc.id,
                  caseNumber: mc.caseNumber,
                  title: mc.title,
                  patient: {
                    user: { fullName: pat?.user.fullName || "Patient" },
                  },
                }
              : null,
          };
        });
      return jsonResp({ transfers });
    }

    if (method === "POST") {
      if (!hasPerm(currentUser, PERMISSIONS.DEPARTMENTS_TRANSFER)) {
        return forbiddenResp(PERMISSIONS.DEPARTMENTS_TRANSFER);
      }
      const {
        medicalCaseId,
        toDepartmentId,
        targetDoctorId,
        reason,
        clinicalSummary,
        priority,
      } = body as Record<string, string>;

      if (!medicalCaseId || !toDepartmentId || !reason?.trim() || !clinicalSummary?.trim()) {
        return jsonResp(
          { error: "Cas médical, service cible, motif et résumé clinique requis" },
          400
        );
      }
      const mc = db.medicalCases.find((c) => c.id === medicalCaseId);
      if (!mc) return jsonResp({ error: "Cas médical introuvable" }, 404);
      if (mc.departmentId === toDepartmentId) {
        return jsonResp(
          { error: "Le patient se trouve déjà dans ce département" },
          400
        );
      }

      const created: RawTransfer = {
        id: uid("tr"),
        medicalCaseId,
        fromDepartmentId: mc.departmentId,
        toDepartmentId,
        requestedByUserId: currentUser!.id,
        requestedByName: currentUser!.fullName,
        targetDoctorId: targetDoctorId || null,
        reason: reason.trim(),
        clinicalSummary: clinicalSummary.trim(),
        priority: priority || "NORMALE",
        status: "EN_ATTENTE",
        createdAt: new Date().toISOString(),
        resolvedAt: null,
      };
      db.transfers.unshift(created);
      saveStore(db);
      return jsonResp({ transfer: created }, 201);
    }

    if (method === "PATCH") {
      if (!hasPerm(currentUser, PERMISSIONS.DEPARTMENTS_TRANSFER)) {
        return forbiddenResp(PERMISSIONS.DEPARTMENTS_TRANSFER);
      }
      const { id, status } = body as { id: string; status: "ACCEPTE" | "REFUSE" };
      const tr = db.transfers.find((t) => t.id === id);
      if (!tr) return jsonResp({ error: "Transfert introuvable" }, 404);
      if (tr.status !== "EN_ATTENTE") {
        return jsonResp({ error: "Ce transfert a déjà été traité" }, 400);
      }

      tr.status = status;
      tr.resolvedAt = new Date().toISOString();

      if (status === "ACCEPTE") {
        const mc = db.medicalCases.find((c) => c.id === tr.medicalCaseId);
        const fromDept = db.departments.find((d) => d.id === tr.fromDepartmentId);
        const toDept = db.departments.find((d) => d.id === tr.toDepartmentId);
        if (mc) {
          mc.departmentId = tr.toDepartmentId;
          if (
            tr.targetDoctorId &&
            !mc.assignedDoctors.some((ad) => ad.doctorId === tr.targetDoctorId)
          ) {
            mc.assignedDoctors.push({
              id: uid("assign"),
              doctorId: tr.targetDoctorId,
              roleInCase: `Médecin Récepteur (${toDept?.name || ""})`,
            });
          }
          mc.clinicalNotes.unshift({
            id: uid("note"),
            authorUserId: currentUser!.id,
            authorName: currentUser!.fullName,
            authorRole: currentUser!.roleNames.join(" / ") || currentUser!.profileType,
            noteType: "OBSERVATION",
            content: `Transfert inter-services accepté : ${fromDept?.name || ""} → ${toDept?.name || ""}. Motif : ${tr.reason}.`,
            prescriptionDetails: null,
            createdAt: new Date().toISOString(),
          });
        }
        if (fromDept) {
          fromDept.occupiedBeds = Math.max(0, fromDept.occupiedBeds - 1);
        }
        if (toDept) {
          toDept.occupiedBeds = Math.min(toDept.totalBeds, toDept.occupiedBeds + 1);
        }
      }

      saveStore(db);
      return jsonResp({ transfer: tr });
    }
  }

  // ==================== /api/patients ====================
  if (pathPart === "/api/patients") {
    if (method === "GET") {
      if (
        !hasAnyPerm(currentUser, [
          PERMISSIONS.FOLDER_VIEW_ALL,
          PERMISSIONS.FOLDER_VIEW_OWN,
        ])
      ) {
        return forbiddenResp(PERMISSIONS.FOLDER_VIEW_ALL);
      }
      const canViewAll = hasPerm(currentUser, PERMISSIONS.FOLDER_VIEW_ALL);
      const ownPatientId = currentUser?.patientProfile?.id;

      if (!canViewAll && !ownPatientId) {
        return jsonResp({ patients: [], scope: "NONE" });
      }

      const patientUsers = db.users.filter((u) => {
        if (!u.patientProfile) return false;
        return canViewAll ? true : u.patientProfile.id === ownPatientId;
      });

      const patients = patientUsers
        .sort((a, b) =>
          a.patientProfile!.folderNumber.localeCompare(
            b.patientProfile!.folderNumber
          )
        )
        .map((u) => {
          const pat = u.patientProfile!;
          const cases = db.medicalCases
            .filter((mc) => mc.patientId === pat.id)
            .sort(
              (a, b) =>
                new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime()
            )
            .map((mc) => hydrateMedicalCase(db, mc));

          const invoices = db.invoices
            .filter((inv) => inv.patientId === pat.id)
            .map((inv) => ({
              ...inv,
              department: getDept(db, inv.departmentId),
            }));

          return {
            ...pat,
            user: {
              id: u.id,
              fullName: u.fullName,
              email: u.email,
              phone: u.phone,
              avatarColor: u.avatarColor,
              isActive: u.isActive,
            },
            medicalCases: cases,
            invoices,
          };
        });

      return jsonResp({
        patients,
        scope: canViewAll ? "ALL" : "OWN",
      });
    }

    if (method === "POST") {
      if (
        !hasAnyPerm(currentUser, [
          PERMISSIONS.PROFILES_MANAGE,
          PERMISSIONS.CASE_CREATE,
        ])
      ) {
        return forbiddenResp(PERMISSIONS.PROFILES_MANAGE);
      }
      const { fullName, email, phone, birthDate, gender, bloodType, allergies } =
        body as Record<string, string>;
      if (!fullName?.trim() || !email?.trim()) {
        return jsonResp(
          { error: "Nom complet et email sont obligatoires" },
          400
        );
      }
      const cleanEmail = email.trim().toLowerCase();
      if (db.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
        return jsonResp(
          { error: "Un utilisateur avec cet email existe déjà" },
          409
        );
      }

      const count = db.users.filter((u) => u.patientProfile).length;
      const folderNumber = `DOS-2026-${String(count + 1).padStart(3, "0")}`;
      const patRole = db.roles.find((r) => r.code === "ROLE_PATIENT");
      const patProfileId = uid("pat");

      const newUser: RawUser = {
        id: uid("user"),
        email: cleanEmail,
        password: "demo",
        fullName: fullName.trim(),
        phone: phone?.trim() || null,
        avatarColor: "#0284c7",
        profileType: "PATIENT",
        isActive: true,
        roleIds: patRole ? [patRole.id] : [],
        patientProfile: {
          id: patProfileId,
          folderNumber,
          nationalId: "En cours",
          birthDate: birthDate || "1990-01-01",
          gender: gender || "Non précisé",
          bloodType: bloodType || "Inconnu",
          allergies: allergies?.trim() || "Aucune connue",
          chronicConditions: "Aucune",
          emergencyContactName: "Non renseigné",
          emergencyContactPhone: "Non renseigné",
          insuranceProvider: "CPAM",
          insuranceNumber: "À compléter",
        },
      };
      db.users.push(newUser);
      saveStore(db);
      return jsonResp({ patient: newUser.patientProfile }, 201);
    }
  }

  // ==================== /api/cases ====================
  if (pathPart === "/api/cases") {
    if (method === "POST") {
      if (!hasPerm(currentUser, PERMISSIONS.CASE_CREATE)) {
        return forbiddenResp(PERMISSIONS.CASE_CREATE);
      }
      const {
        patientId,
        departmentId,
        leadDoctorId,
        title,
        problemCategory,
        diagnosis,
        symptoms,
        treatmentPlan,
        priority,
        roomBed,
        coDoctorIds,
      } = body as {
        patientId: string;
        departmentId: string;
        leadDoctorId: string;
        title: string;
        problemCategory?: string;
        diagnosis?: string;
        symptoms?: string;
        treatmentPlan?: string;
        priority?: string;
        roomBed?: string;
        coDoctorIds?: string[];
      };

      if (!patientId || !departmentId || !leadDoctorId || !title?.trim()) {
        return jsonResp(
          {
            error:
              "Patient, service, médecin référent et intitulé du cas sont requis",
          },
          400
        );
      }

      const caseNumber = `CAS-2026-${101 + db.medicalCases.length}`;
      const uniqueCoDocs = Array.from(
        new Set((coDoctorIds || []).filter((id) => id && id !== leadDoctorId))
      );

      const newCase: RawMedicalCase = {
        id: uid("case"),
        caseNumber,
        patientId,
        departmentId,
        leadDoctorId,
        title: title.trim(),
        problemCategory: problemCategory?.trim() || "Médecine Spécialisée",
        diagnosis: diagnosis?.trim() || "En cours d'évaluation",
        symptoms: symptoms?.trim() || "À documenter",
        treatmentPlan: treatmentPlan?.trim() || "Bilan initial en cours",
        status: priority === "URGENCE_VITALE" ? "CRITIQUE" : "ACTIF",
        priority: priority || "NORMALE",
        roomBed: roomBed?.trim() || null,
        openedAt: new Date().toISOString(),
        closedAt: null,
        assignedDoctors: [
          {
            id: uid("assign"),
            doctorId: leadDoctorId,
            roleInCase: "Médecin Référent",
          },
          ...uniqueCoDocs.map((docId) => ({
            id: uid("assign"),
            doctorId: docId,
            roleInCase: "Médecin Consultant",
          })),
        ],
        clinicalNotes: [
          {
            id: uid("note"),
            authorUserId: currentUser!.id,
            authorName: currentUser!.fullName,
            authorRole:
              currentUser!.roleNames.join(" / ") || currentUser!.profileType,
            noteType: "OBSERVATION",
            content: `Ouverture du cas médical : ${title.trim()}.`,
            prescriptionDetails: null,
            createdAt: new Date().toISOString(),
          },
        ],
        vitalSignLogs: [],
      };

      db.medicalCases.unshift(newCase);
      saveStore(db);
      return jsonResp({ medicalCase: hydrateMedicalCase(db, newCase) }, 201);
    }

    if (method === "PATCH") {
      const { action } = body as { action: string };

      if (action === "update_case") {
        if (!hasPerm(currentUser, PERMISSIONS.CASE_EDIT)) {
          return forbiddenResp(PERMISSIONS.CASE_EDIT);
        }
        const { medicalCaseId, status, priority, diagnosis, treatmentPlan, roomBed } =
          body as Record<string, string>;
        const mc = db.medicalCases.find((c) => c.id === medicalCaseId);
        if (!mc) return jsonResp({ error: "Cas introuvable" }, 404);
        if (status) {
          mc.status = status;
          mc.closedAt = status === "CLOTURE" ? new Date().toISOString() : null;
        }
        if (priority) mc.priority = priority;
        if (diagnosis !== undefined) mc.diagnosis = diagnosis;
        if (treatmentPlan !== undefined) mc.treatmentPlan = treatmentPlan;
        if (roomBed !== undefined) mc.roomBed = roomBed;
        saveStore(db);
        return jsonResp({ medicalCase: mc });
      }

      if (action === "assign_doctor") {
        if (!hasPerm(currentUser, PERMISSIONS.CASE_ASSIGN_DOCTOR)) {
          return forbiddenResp(PERMISSIONS.CASE_ASSIGN_DOCTOR);
        }
        const { medicalCaseId, doctorId, roleInCase } = body as {
          medicalCaseId: string;
          doctorId: string;
          roleInCase?: string;
        };
        const mc = db.medicalCases.find((c) => c.id === medicalCaseId);
        if (!mc || !doctorId) {
          return jsonResp({ error: "Cas médical et médecin requis" }, 400);
        }
        const existing = mc.assignedDoctors.find((a) => a.doctorId === doctorId);
        if (existing) {
          existing.roleInCase =
            roleInCase?.trim() || "Médecin Spécialiste Consultant";
        } else {
          mc.assignedDoctors.push({
            id: uid("assign"),
            doctorId,
            roleInCase: roleInCase?.trim() || "Médecin Spécialiste Consultant",
          });
        }
        saveStore(db);
        return jsonResp({ ok: true });
      }

      if (action === "remove_doctor") {
        if (!hasPerm(currentUser, PERMISSIONS.CASE_ASSIGN_DOCTOR)) {
          return forbiddenResp(PERMISSIONS.CASE_ASSIGN_DOCTOR);
        }
        const { medicalCaseId, doctorId } = body as {
          medicalCaseId: string;
          doctorId: string;
        };
        const mc = db.medicalCases.find((c) => c.id === medicalCaseId);
        if (!mc) return jsonResp({ error: "Cas introuvable" }, 404);
        if (mc.leadDoctorId === doctorId) {
          return jsonResp(
            { error: "Impossible de retirer le médecin référent principal" },
            400
          );
        }
        mc.assignedDoctors = mc.assignedDoctors.filter(
          (a) => a.doctorId !== doctorId
        );
        saveStore(db);
        return jsonResp({ ok: true });
      }

      if (action === "add_note") {
        if (!hasPerm(currentUser, PERMISSIONS.CLINICAL_NOTE_CREATE)) {
          return forbiddenResp(PERMISSIONS.CLINICAL_NOTE_CREATE);
        }
        const { medicalCaseId, noteType, content, prescriptionDetails } =
          body as Record<string, string>;
        const mc = db.medicalCases.find((c) => c.id === medicalCaseId);
        if (!mc || !content?.trim()) {
          return jsonResp({ error: "Contenu de la note requis" }, 400);
        }
        const canWritePrescription = hasPerm(currentUser, PERMISSIONS.CASE_EDIT);
        const note = {
          id: uid("note"),
          authorUserId: currentUser!.id,
          authorName: currentUser!.fullName,
          authorRole:
            currentUser!.roleNames.join(" / ") || currentUser!.profileType,
          noteType: canWritePrescription
            ? noteType || "OBSERVATION"
            : "OBSERVATION",
          content: content.trim(),
          prescriptionDetails: canWritePrescription
            ? prescriptionDetails?.trim() || null
            : null,
          createdAt: new Date().toISOString(),
        };
        mc.clinicalNotes.unshift(note);
        saveStore(db);
        return jsonResp({ note }, 201);
      }

      if (action === "add_vitals") {
        if (!hasPerm(currentUser, PERMISSIONS.VITALS_RECORD)) {
          return forbiddenResp(PERMISSIONS.VITALS_RECORD);
        }
        const {
          medicalCaseId,
          bloodPressure,
          heartRate,
          temperature,
          oxygenSaturation,
          notes,
        } = body as {
          medicalCaseId: string;
          bloodPressure: string;
          heartRate: number;
          temperature: number;
          oxygenSaturation: number;
          notes?: string;
        };
        const mc = db.medicalCases.find((c) => c.id === medicalCaseId);
        if (!mc || !bloodPressure) {
          return jsonResp({ error: "Constantes vitales incomplètes" }, 400);
        }
        const vital = {
          id: uid("vital"),
          recordedByName: currentUser!.fullName,
          bloodPressure,
          heartRate: Number(heartRate) || 75,
          temperature: Number(temperature) || 37.0,
          oxygenSaturation: Number(oxygenSaturation) || 98,
          notes: notes?.trim() || null,
          recordedAt: new Date().toISOString(),
        };
        mc.vitalSignLogs.unshift(vital);
        saveStore(db);
        return jsonResp({ vital }, 201);
      }
    }
  }

  // ==================== /api/profiles ====================
  if (pathPart === "/api/profiles") {
    if (method === "GET") {
      if (!currentUser) return jsonResp({ error: "Non authentifié" }, 401);
      const canViewDirectory = hasPerm(
        currentUser,
        PERMISSIONS.PROFILES_VIEW_DIRECTORY
      );
      const canViewDepts = hasPerm(currentUser, PERMISSIONS.DEPARTMENTS_VIEW);

      const list = db.users
        .filter((u) => (canViewDirectory ? true : u.id === currentUser.id))
        .sort(
          (a, b) =>
            a.profileType.localeCompare(b.profileType) ||
            a.fullName.localeCompare(b.fullName)
        )
        .map((u) => ({
          id: u.id,
          email: u.email,
          fullName: u.fullName,
          phone: u.phone,
          avatarColor: u.avatarColor,
          profileType: u.profileType,
          isActive: u.isActive,
          roles: u.roleIds
            .map((rid) => db.roles.find((r) => r.id === rid))
            .filter((r): r is RawRole => Boolean(r)),
          doctorProfile: u.doctorProfile
            ? {
                ...u.doctorProfile,
                department: canViewDepts
                  ? getDept(db, u.doctorProfile.departmentId)
                  : stripDeptCapacity(getDept(db, u.doctorProfile.departmentId)),
                _count: {
                  leadCases: db.medicalCases.filter(
                    (mc) => mc.leadDoctorId === u.doctorProfile!.id
                  ).length,
                  assignedCases: db.medicalCases.filter((mc) =>
                    mc.assignedDoctors.some(
                      (a) => a.doctorId === u.doctorProfile!.id
                    )
                  ).length,
                },
              }
            : null,
          nurseProfile: u.nurseProfile
            ? {
                ...u.nurseProfile,
                department: canViewDepts
                  ? getDept(db, u.nurseProfile.departmentId)
                  : stripDeptCapacity(getDept(db, u.nurseProfile.departmentId)),
              }
            : null,
          adminProfile: u.adminProfile || null,
          financialProfile: u.financialProfile || null,
          patientProfile: u.patientProfile
            ? {
                ...u.patientProfile,
                _count: {
                  medicalCases: db.medicalCases.filter(
                    (mc) => mc.patientId === u.patientProfile!.id
                  ).length,
                  invoices: db.invoices.filter(
                    (inv) => inv.patientId === u.patientProfile!.id
                  ).length,
                },
              }
            : null,
        }));

      return jsonResp({
        profiles: list,
        scope: canViewDirectory ? "DIRECTORY" : "OWN",
      });
    }

    if (method === "POST") {
      if (!hasPerm(currentUser, PERMISSIONS.PROFILES_MANAGE)) {
        return forbiddenResp(PERMISSIONS.PROFILES_MANAGE);
      }
      const {
        fullName,
        email,
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
        return jsonResp(
          { error: "Nom, email et type de profil sont requis" },
          400
        );
      }
      const cleanEmail = email.trim().toLowerCase();
      if (db.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
        return jsonResp({ error: "Cet email est déjà utilisé" }, 409);
      }

      const roleCodeMap: Record<string, string> = {
        DOCTOR: "ROLE_MEDECIN",
        NURSE: "ROLE_INFIRMIER",
        ADMIN: "ROLE_ADMIN",
        FINANCIAL: "ROLE_FINANCE",
        PATIENT: "ROLE_PATIENT",
      };
      const defRole = db.roles.find(
        (r) => r.code === (roleCodeMap[profileType] || "ROLE_PATIENT")
      );
      const firstDeptId = departmentId || db.departments[0]?.id || "dept-urgence";
      const rnd = Math.floor(1000 + Math.random() * 9000);

      const newUser: RawUser = {
        id: uid("user"),
        email: cleanEmail,
        password: "demo",
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
        isActive: true,
        roleIds: defRole ? [defRole.id] : [],
        ...(profileType === "DOCTOR"
          ? {
              doctorProfile: {
                id: uid("doc"),
                departmentId: firstDeptId,
                rppsNumber: `RPPS-1000${rnd}99`,
                specialty: specialty || "Médecine Polyvalente",
                grade: grade || "Praticien Hospitalier",
                availability: "DISPONIBLE",
                bio: "Praticien hospitalier E-HOSPIA.",
              },
            }
          : {}),
        ...(profileType === "NURSE"
          ? {
              nurseProfile: {
                id: uid("nurse"),
                departmentId: firstDeptId,
                matricule: `IDE-2026-${rnd}`,
                shift: shift || "MATIN",
                qualification: qualification || "Infirmier(e) Diplômé(e) d'État",
              },
            }
          : {}),
        ...(profileType === "ADMIN"
          ? {
              adminProfile: {
                id: uid("adm"),
                matricule: `ADM-2026-${rnd}`,
                position: position || "Cadre Administratif",
                office: office || "Bâtiment Direction",
                scope: "Administration Hospitalière",
              },
            }
          : {}),
        ...(profileType === "FINANCIAL"
          ? {
              financialProfile: {
                id: uid("fin"),
                matricule: `FIN-2026-${rnd}`,
                title: title || "Gestionnaire Facturation",
                billingUnit: billingUnit || "Service Financier",
                authorizationLimit: 15000,
              },
            }
          : {}),
        ...(profileType === "PATIENT"
          ? {
              patientProfile: {
                id: uid("pat"),
                folderNumber: `DOS-2026-${rnd}`,
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
            }
          : {}),
      };

      db.users.push(newUser);
      saveStore(db);
      return jsonResp({ user: newUser }, 201);
    }

    if (method === "PATCH") {
      if (!currentUser) return jsonResp({ error: "Non authentifié" }, 401);
      const { targetUserId, availability, phone, bio, isActive } = body as {
        targetUserId: string;
        availability?: string;
        phone?: string;
        bio?: string;
        isActive?: boolean;
      };
      const isSelf = targetUserId === currentUser.id;
      const canManage = hasPerm(currentUser, PERMISSIONS.PROFILES_MANAGE);
      if (!isSelf && !canManage) {
        return forbiddenResp(PERMISSIONS.PROFILES_MANAGE);
      }
      const target = db.users.find((u) => u.id === targetUserId);
      if (!target) return jsonResp({ error: "Utilisateur introuvable" }, 404);
      if (phone !== undefined) target.phone = phone;
      if (isActive !== undefined && canManage) target.isActive = isActive;
      if (target.doctorProfile) {
        if (availability) target.doctorProfile.availability = availability;
        if (bio !== undefined) target.doctorProfile.bio = bio;
      }
      saveStore(db);
      return jsonResp({ ok: true });
    }
  }

  // ==================== /api/rbac ====================
  if (pathPart === "/api/rbac") {
    if (method === "GET") {
      const roles = db.roles.map((r) => ({
        ...r,
        userCount: db.users.filter((u) => u.roleIds.includes(r.id)).length,
        permissionCodes: r.permissionIds
          .map((pid) => db.permissions.find((p) => p.id === pid)?.code)
          .filter((c): c is string => Boolean(c)),
      }));

      const users = db.users.map((u) => {
        const auth = buildAuthUser(db, u.id);
        return {
          id: u.id,
          fullName: u.fullName,
          email: u.email,
          profileType: u.profileType,
          avatarColor: u.avatarColor,
          isActive: u.isActive,
          roleIds: u.roleIds,
          roles: u.roleIds
            .map((rid) => db.roles.find((r) => r.id === rid))
            .filter((r): r is RawRole => Boolean(r))
            .map((r) => ({ id: r.id, code: r.code, name: r.name })),
          effectivePermissions: auth?.effectivePermissions || [],
        };
      });

      return jsonResp({
        roles,
        permissions: db.permissions,
        users,
      });
    }

    if (method === "POST") {
      if (!hasPerm(currentUser, PERMISSIONS.RBAC_MANAGE)) {
        return forbiddenResp(PERMISSIONS.RBAC_MANAGE);
      }
      const { name, description, profileType, permissionIds } = body as {
        name: string;
        description?: string;
        profileType: string;
        permissionIds?: string[];
      };
      if (!name?.trim()) {
        return jsonResp({ error: "Le nom du rôle est obligatoire" }, 400);
      }
      const code =
        "ROLE_" +
        name
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "");
      if (db.roles.some((r) => r.code === code)) {
        return jsonResp({ error: "Un rôle avec ce code existe déjà" }, 409);
      }

      const newRole: RawRole = {
        id: uid("role"),
        code,
        name: name.trim(),
        description: description?.trim() || "Rôle personnalisé E-HOSPIA",
        profileType: profileType || "DOCTOR",
        permissionIds: permissionIds || [],
      };
      db.roles.push(newRole);
      saveStore(db);
      return jsonResp({ role: newRole }, 201);
    }

    if (method === "PATCH") {
      if (!hasPerm(currentUser, PERMISSIONS.RBAC_MANAGE)) {
        return forbiddenResp(PERMISSIONS.RBAC_MANAGE);
      }
      const { action, roleId, permissionId, userId } = body as {
        action: "toggle_role_permission" | "toggle_user_role";
        roleId: string;
        permissionId?: string;
        userId?: string;
      };

      if (action === "toggle_role_permission" && roleId && permissionId) {
        const role = db.roles.find((r) => r.id === roleId);
        if (!role) return jsonResp({ error: "Rôle introuvable" }, 404);
        const idx = role.permissionIds.indexOf(permissionId);
        if (idx >= 0) {
          role.permissionIds.splice(idx, 1);
          saveStore(db);
          return jsonResp({ enabled: false });
        } else {
          role.permissionIds.push(permissionId);
          saveStore(db);
          return jsonResp({ enabled: true });
        }
      }

      if (action === "toggle_user_role" && userId && roleId) {
        const usr = db.users.find((u) => u.id === userId);
        if (!usr) return jsonResp({ error: "Utilisateur introuvable" }, 404);
        const idx = usr.roleIds.indexOf(roleId);
        if (idx >= 0) {
          usr.roleIds.splice(idx, 1);
          saveStore(db);
          return jsonResp({ assigned: false });
        } else {
          usr.roleIds.push(roleId);
          saveStore(db);
          return jsonResp({ assigned: true });
        }
      }

      return jsonResp({ error: "Action RBAC invalide" }, 400);
    }
  }

  // ==================== /api/billing ====================
  if (pathPart === "/api/billing") {
    if (method === "GET") {
      if (
        !hasAnyPerm(currentUser, [
          PERMISSIONS.BILLING_VIEW_ALL,
          PERMISSIONS.BILLING_VIEW_OWN,
        ])
      ) {
        return forbiddenResp(PERMISSIONS.BILLING_VIEW_ALL);
      }
      const canViewAll = hasPerm(currentUser, PERMISSIONS.BILLING_VIEW_ALL);
      const canManage = hasPerm(currentUser, PERMISSIONS.BILLING_MANAGE);
      const ownPatientId = currentUser?.patientProfile?.id;

      if (!canViewAll && !ownPatientId) {
        return jsonResp({ invoices: [], scope: "NONE" });
      }

      const invoices = db.invoices
        .filter((inv) => (canViewAll ? true : inv.patientId === ownPatientId))
        .sort(
          (a, b) =>
            new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
        )
        .map((inv) => {
          const pat = findPatientByProfileId(db, inv.patientId);
          const mc = inv.medicalCaseId
            ? db.medicalCases.find((c) => c.id === inv.medicalCaseId)
            : null;
          return {
            ...inv,
            patient: pat
              ? {
                  id: pat.id,
                  folderNumber: pat.folderNumber,
                  user: { fullName: pat.user.fullName, email: pat.user.email },
                }
              : {
                  id: inv.patientId,
                  folderNumber: "DOS-?",
                  user: { fullName: "Patient", email: "" },
                },
            department: getDept(db, inv.departmentId),
            medicalCase: mc
              ? { id: mc.id, caseNumber: mc.caseNumber, title: mc.title }
              : null,
          };
        });

      const patientOptions = canManage
        ? db.users
            .filter((u) => u.patientProfile)
            .sort((a, b) =>
              a.patientProfile!.folderNumber.localeCompare(
                b.patientProfile!.folderNumber
              )
            )
            .map((u) => ({
              id: u.patientProfile!.id,
              folderNumber: u.patientProfile!.folderNumber,
              user: { fullName: u.fullName },
            }))
        : [];

      const departmentOptions = canManage
        ? sortDepts(db.departments).map((d) => ({
            id: d.id,
            name: d.name,
            color: d.color,
          }))
        : [];

      return jsonResp({
        invoices,
        scope: canViewAll ? "ALL" : "OWN",
        patientOptions,
        departmentOptions,
      });
    }

    if (method === "POST") {
      if (!hasPerm(currentUser, PERMISSIONS.BILLING_MANAGE)) {
        return forbiddenResp(PERMISSIONS.BILLING_MANAGE);
      }
      const {
        patientId,
        medicalCaseId,
        departmentId,
        description,
        totalAmount,
        insuranceCovered,
        status,
      } = body as {
        patientId: string;
        medicalCaseId?: string;
        departmentId: string;
        description: string;
        totalAmount: number;
        insuranceCovered: number;
        status?: string;
      };

      if (!patientId || !departmentId || !description?.trim() || totalAmount <= 0) {
        return jsonResp(
          {
            error:
              "Patient, service, description et montant positif requis",
          },
          400
        );
      }

      const total = Number(totalAmount);
      const covered = Math.min(total, Math.max(0, Number(insuranceCovered) || 0));
      const responsibility = Math.max(0, total - covered);
      const invoiceNumber = `FAC-2026-${String(895 + db.invoices.length).padStart(
        4,
        "0"
      )}`;

      const created: RawInvoice = {
        id: uid("inv"),
        invoiceNumber,
        patientId,
        medicalCaseId: medicalCaseId || null,
        departmentId,
        description: description.trim(),
        totalAmount: total,
        insuranceCovered: covered,
        patientResponsibility: responsibility,
        status: status || "EN_ATTENTE",
        handledByUserId: currentUser!.id,
        issuedAt: new Date().toISOString(),
        paidAt: status === "PAYEE" ? new Date().toISOString() : null,
      };
      db.invoices.unshift(created);
      saveStore(db);
      return jsonResp({ invoice: created }, 201);
    }

    if (method === "PATCH") {
      if (!hasPerm(currentUser, PERMISSIONS.BILLING_MANAGE)) {
        return forbiddenResp(PERMISSIONS.BILLING_MANAGE);
      }
      const { id, status } = body as { id: string; status: string };
      const inv = db.invoices.find((i) => i.id === id);
      if (
        !inv ||
        !["EN_ATTENTE", "PAYEE", "PRISE_EN_CHARGE", "PARTIELLE"].includes(status)
      ) {
        return jsonResp({ error: "Statut invalide" }, 400);
      }
      inv.status = status;
      inv.handledByUserId = currentUser!.id;
      inv.paidAt = status === "PAYEE" ? new Date().toISOString() : null;
      saveStore(db);
      return jsonResp({ invoice: inv });
    }
  }

  // ==================== /api/ai ====================
  if (pathPart === "/api/ai") {
    if (method === "GET") {
      if (
        !hasAnyPerm(currentUser, [PERMISSIONS.AI_USE, PERMISSIONS.AI_MANAGE])
      ) {
        return forbiddenResp(PERMISSIONS.AI_USE);
      }
      return jsonResp({
        aiConfig: buildAiPublicConfig(
          db,
          hasPerm(currentUser, PERMISSIONS.AI_MANAGE)
        ),
      });
    }

    if (method === "POST") {
      const { action } = body as { action: string };

      if (action === "add_model") {
        if (!hasPerm(currentUser, PERMISSIONS.AI_MANAGE)) {
          return forbiddenResp(PERMISSIONS.AI_MANAGE);
        }
        const {
          name,
          provider,
          modelId,
          endpoint,
          apiKey,
          description,
          setAsActive,
        } = body as {
          name: string;
          provider: string;
          modelId: string;
          endpoint?: string;
          apiKey?: string;
          description?: string;
          setAsActive?: boolean;
        };

        if (!name?.trim() || !modelId?.trim()) {
          return jsonResp(
            {
              error:
                "Le nom du modèle et l'identifiant technique (modelId) sont requis",
            },
            400
          );
        }

        const newModel: AiModelConfig = {
          id: uid("model"),
          name: name.trim(),
          provider: provider || "OPENAI_COMPATIBLE",
          modelId: modelId.trim(),
          endpoint:
            endpoint?.trim() ||
            (provider === "GOOGLE_GEMINI"
              ? "https://generativelanguage.googleapis.com/v1beta"
              : provider === "OLLAMA_LOCAL"
                ? "http://localhost:11434/v1"
                : "https://api.openai.com/v1"),
          apiKey: apiKey?.trim() || "",
          description:
            description?.trim() ||
            `Modèle ${provider || "personnalisé"} ajouté par l'Administration.`,
          addedBy: currentUser!.fullName,
          createdAt: new Date().toISOString(),
        };

        db.aiSettings.models.push(newModel);
        if (setAsActive) {
          db.aiSettings.activeModelId = newModel.id;
        }
        saveStore(db);
        return jsonResp(
          {
            model: newModel,
            aiConfig: buildAiPublicConfig(db, true),
          },
          201
        );
      }

      if (action === "set_active_model") {
        if (!hasPerm(currentUser, PERMISSIONS.AI_MANAGE)) {
          return forbiddenResp(PERMISSIONS.AI_MANAGE);
        }
        const { modelId } = body as { modelId: string };
        const found = db.aiSettings.models.find((m) => m.id === modelId);
        if (!found) {
          return jsonResp({ error: "Modèle IA introuvable" }, 404);
        }
        db.aiSettings.activeModelId = found.id;
        saveStore(db);
        return jsonResp({ aiConfig: buildAiPublicConfig(db, true) });
      }

      if (action === "update_settings") {
        if (!hasPerm(currentUser, PERMISSIONS.AI_MANAGE)) {
          return forbiddenResp(PERMISSIONS.AI_MANAGE);
        }
        const {
          hospitalSystemPrompt,
          temperature,
          targetModelId,
          apiKey,
          endpoint,
        } = body as {
          hospitalSystemPrompt?: string;
          temperature?: number;
          targetModelId?: string;
          apiKey?: string;
          endpoint?: string;
        };

        if (hospitalSystemPrompt !== undefined) {
          db.aiSettings.hospitalSystemPrompt = hospitalSystemPrompt;
        }
        if (temperature !== undefined) {
          db.aiSettings.temperature = Math.min(
            1,
            Math.max(0, Number(temperature))
          );
        }
        if (targetModelId) {
          const target = db.aiSettings.models.find((m) => m.id === targetModelId);
          if (target) {
            if (apiKey !== undefined) target.apiKey = apiKey;
            if (endpoint !== undefined) target.endpoint = endpoint;
          }
        }
        saveStore(db);
        return jsonResp({ aiConfig: buildAiPublicConfig(db, true) });
      }

      if (action === "delete_model") {
        if (!hasPerm(currentUser, PERMISSIONS.AI_MANAGE)) {
          return forbiddenResp(PERMISSIONS.AI_MANAGE);
        }
        const { modelId } = body as { modelId: string };
        if (db.aiSettings.models.length <= 1) {
          return jsonResp(
            { error: "Impossible de supprimer le dernier modèle disponible" },
            400
          );
        }
        db.aiSettings.models = db.aiSettings.models.filter(
          (m) => m.id !== modelId
        );
        if (db.aiSettings.activeModelId === modelId) {
          db.aiSettings.activeModelId = db.aiSettings.models[0].id;
        }
        saveStore(db);
        return jsonResp({ aiConfig: buildAiPublicConfig(db, true) });
      }

      if (action === "chat") {
        if (!hasPerm(currentUser, PERMISSIONS.AI_USE)) {
          return forbiddenResp(PERMISSIONS.AI_USE);
        }
        const { prompt } = body as { prompt: string };
        if (!prompt?.trim()) {
          return jsonResp({ error: "Veuillez saisir une question" }, 400);
        }

        const activeModel =
          db.aiSettings.models.find(
            (m) => m.id === db.aiSettings.activeModelId
          ) || db.aiSettings.models[0];

        const result = await generateRbacAiReply(
          db,
          currentUser!,
          activeModel,
          prompt.trim()
        );
        return jsonResp(result);
      }

      return jsonResp({ error: "Action IA invalide" }, 400);
    }
  }

  return jsonResp({ error: `Route démo inconnue : ${method} ${url}` }, 404);
}

function buildAiPublicConfig(
  db: EhospiaJsonDb,
  includeSecrets: boolean
): AiPublicConfig {
  const active =
    db.aiSettings.models.find((m) => m.id === db.aiSettings.activeModelId) ||
    db.aiSettings.models[0] ||
    null;
  const sanitizeModel = (m: AiModelConfig) => ({
    id: m.id,
    name: m.name,
    provider: m.provider,
    modelId: m.modelId,
    endpoint: m.endpoint,
    description: m.description,
    addedBy: m.addedBy,
    createdAt: m.createdAt,
  });

  return {
    activeModel: active ? sanitizeModel(active) : null,
    hospitalSystemPrompt: db.aiSettings.hospitalSystemPrompt,
    temperature: db.aiSettings.temperature,
    ...(includeSecrets ? { models: db.aiSettings.models } : {}),
  };
}

async function generateRbacAiReply(
  db: EhospiaJsonDb,
  user: AuthUser,
  model: AiModelConfig,
  prompt: string
) {
  const perms = new Set(user.effectivePermissions);
  const canViewDepts = perms.has(PERMISSIONS.DEPARTMENTS_VIEW);
  const canViewDirectory = perms.has(PERMISSIONS.PROFILES_VIEW_DIRECTORY);
  const canViewAllFolders = perms.has(PERMISSIONS.FOLDER_VIEW_ALL);
  const canViewOwnFolder = perms.has(PERMISSIONS.FOLDER_VIEW_OWN);
  const canViewAllBilling = perms.has(PERMISSIONS.BILLING_VIEW_ALL);
  const canViewOwnBilling = perms.has(PERMISSIONS.BILLING_VIEW_OWN);
  const canCommunicate = perms.has(PERMISSIONS.DEPARTMENTS_COMMUNICATE);
  const canTransfer = perms.has(PERMISSIONS.DEPARTMENTS_TRANSFER);
  const canManageRbac = perms.has(PERMISSIONS.RBAC_MANAGE);

  const scopeLabels: string[] = [];
  if (canViewDepts) scopeLabels.push("Capacité & Lits des 8 départements");
  if (canViewDirectory) scopeLabels.push("Annuaire & Effectifs (Médecins, Infirmiers)");
  if (canViewAllFolders) scopeLabels.push("Tous les dossiers médicaux");
  else if (canViewOwnFolder)
    scopeLabels.push(
      `Dossier personnel (${user.patientProfile?.folderNumber || "Patient"})`
    );
  if (canViewAllBilling) scopeLabels.push("Facturation globale");
  else if (canViewOwnBilling) scopeLabels.push("Factures personnelles");
  const rbacScope = scopeLabels.join(" • ") || "Profil de base";

  const q = prompt.toLowerCase();

  // 1. Strict Medical & E-HOSPIA Domain Filter (blocks non-medical / non-hospital topics)
  const hasExplicitExternalTopic =
    /\b(rmse|mse|mae|r2|equation|équation|formula|formule|integral|intégrale|derivative|dérivée|matrix|matrice|calculus|algebra|trigonometry|geometry|python|javascript|typescript|java|c\+\+|sql|html|css|react|leetcode|algorithm|algorithme|capital of|capitale de|president|président|weather|météo|meteo|recipe|recette|football|soccer|world cup|movie|film|song|chanson|poem|poème|poeme|joke|blague|bitcoin|crypto|stock market|planet|planète|solar system)\b/i.test(
      q
    );

  if (hasExplicitExternalTopic) {
    return {
      reply: `🚫 **Hors périmètre Médical & E-HOSPIA** (modèle actif : **${model.name}**)\n\nJe suis l'assistant médical et hospitalier d'**E-HOSPIA**. Je réponds uniquement aux questions liées aux données internes d'E-HOSPIA autorisées par votre profil et aux questions de santé, médecine et soins hospitaliers.`,
      modelUsed: {
        id: model.id,
        name: model.name,
        modelId: model.modelId,
        provider: model.provider,
      },
      mode: "LOCAL_DEMO",
      rbacScope,
    };
  }

  // 2. Strict RBAC guardrails (applies both to local demo and before calling any external LLM)
  const asksHospitalCapacity =
    /\b(lit|lits|bed|beds|capacit[eé]|capacite|capacity|vide|vides|empty|libre|libres|free|occup[eé]s?|occupied|occupation|satur|alerte|combien.*service|d[eé]partement|departement|department)\b/.test(
      q
    );
  if (asksHospitalCapacity && !canViewDepts) {
    return {
      reply: `🔒 **Accès refusé par le contrôle RBAC E-HOSPIA** (modèle actif : **${model.name}**)\n\nVotre profil (**${user.roleNames.join(", ")}**) ne possède pas la permission \`departments.view\`. Les informations sur la capacité des départements, les lits occupés, les lits vides et les niveaux d'alerte de l'hôpital sont strictement réservées à l'Administration, aux Médecins et aux Infirmiers.`,
      modelUsed: {
        id: model.id,
        name: model.name,
        modelId: model.modelId,
        provider: model.provider,
      },
      mode: "LOCAL_DEMO",
      rbacScope,
    };
  }

  const refersToOwnDoctors = /\b(mes|my|do i|me suivent|s'occupent de moi)\b/.test(q);
  const asksHospitalStaff =
    /\b(how many.*(doctor|doctors|nurse|nurses|staff)|combien.*(m[eé]decin|medecins|docteur|infirmier|infirmi[eè]re|personnel|effectif)|annuaire|directory|liste.*(m[eé]decin|infirmier|staff))\b/.test(
      q
    );
  if (
    asksHospitalStaff &&
    !canViewDirectory &&
    !(canViewOwnFolder && refersToOwnDoctors)
  ) {
    return {
      reply: `🔒 **Accès refusé par le contrôle RBAC E-HOSPIA** (modèle actif : **${model.name}**)\n\nVotre profil (**${user.roleNames.join(", ")}**) ne possède pas la permission \`profiles.view_directory\`. L'annuaire global et le décompte des effectifs hospitaliers ne sont pas accessibles à votre rôle.`,
      modelUsed: {
        id: model.id,
        name: model.name,
        modelId: model.modelId,
        provider: model.provider,
      },
      mode: "LOCAL_DEMO",
      rbacScope,
    };
  }

  // Only block clinical questions when they target E-HOSPIA patient folders (preserve general healthcare Q&A!)
  const mentionsSpecificPatientOrRecord =
    /\b(yasmine|alaoui|lucas|fernandez|l[eé]o|leo|dubois|adam|martin|dos-2026|cas-2026|case-10|case-20|case-30|case-40|dossier m[eé]dical|dossiers m[eé]dicaux|dossier patient|dossiers patients|patient folder|patient record|nos patients|our patients|cas m[eé]dical|cas m[eé]dicaux|medical case)\b/.test(
      q
    ) ||
    (/\b(dossier|diagnostic|diagnosis|allergie|prescription|constante|vitals|spo2)\b/.test(
      q
    ) &&
      /\b(patient|patients|h[oô]pital|hospital|ehospia)\b/.test(q));

  if (mentionsSpecificPatientOrRecord && !canViewAllFolders && !canViewOwnFolder) {
    return {
      reply: `🔒 **Secret médical protégé** (modèle actif : **${model.name}**)\n\nVotre profil (**${user.roleNames.join(", ")}**) ne dispose pas de la permission clinique \`folder.view_all\`. Conformément au secret médical d'E-HOSPIA, l'Assistant IA ne peut pas consulter ni résumer les diagnostics ou dossiers médicaux des patients de l'hôpital.`,
      modelUsed: {
        id: model.id,
        name: model.name,
        modelId: model.modelId,
        provider: model.provider,
      },
      mode: "LOCAL_DEMO",
      rbacScope,
    };
  }

  // 3. Build strictly RBAC-filtered context slice with pre-computed totals
  const contextPayload: Record<string, unknown> = {
    utilisateur: {
      nom: user.fullName,
      profil: user.profileType,
      roles: user.roleNames,
      permissionsActives: user.effectivePermissions,
    },
  };

  if (canViewDepts) {
    const totalBeds = db.departments.reduce((s, d) => s + d.totalBeds, 0);
    const occupiedBeds = db.departments.reduce((s, d) => s + d.occupiedBeds, 0);
    const freeBeds = Math.max(0, totalBeds - occupiedBeds);
    contextPayload.syntheseCapacitaireHopital = {
      nombreDepartements: db.departments.length,
      capaciteTotaleLitsHopital: totalBeds,
      totalLitsOccupesHopital: occupiedBeds,
      totalLitsVidesDisponiblesHopital: freeBeds,
      tauxOccupationGlobal: `${totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0}%`,
    };
    contextPayload.departements = sortDepts(db.departments).map((d) => {
      const deptDocs = db.users.filter((u) => u.doctorProfile?.departmentId === d.id);
      const deptNurses = db.users.filter((u) => u.nurseProfile?.departmentId === d.id);
      return {
        nom: d.name,
        etage: d.floor,
        posteInterne: d.phoneExtension,
        totalBeds: d.totalBeds,
        occupiedBeds: d.occupiedBeds,
        litsVides: Math.max(0, d.totalBeds - d.occupiedBeds),
        alertLevel: d.alertLevel,
        nombreMedecinsRattaches: deptDocs.length,
        ...(canViewDirectory
          ? { medecinsRattaches: deptDocs.map((u) => u.fullName) }
          : {}),
        nombreInfirmiersRattaches: deptNurses.length,
        nombreCasActifs: db.medicalCases.filter(
          (mc) => mc.departmentId === d.id && mc.status !== "CLOTURE"
        ).length,
      };
    });
  }

  if (canViewDirectory) {
    const doctors = db.users.filter((u) => u.profileType === "DOCTOR" && u.doctorProfile);
    const nurses = db.users.filter((u) => u.profileType === "NURSE" && u.nurseProfile);
    const admins = db.users.filter((u) => u.profileType === "ADMIN" && u.adminProfile);
    const financials = db.users.filter(
      (u) => u.profileType === "FINANCIAL" && u.financialProfile
    );
    const patients = db.users.filter((u) => u.profileType === "PATIENT" && u.patientProfile);

    contextPayload.effectifsEtAnnuaireHopital = {
      nombreTotalUtilisateurs: db.users.length,
      nombreTotalMedecins: doctors.length,
      nombreTotalInfirmiers: nurses.length,
      nombreTotalAdministrateurs: admins.length,
      nombreTotalFinanciers: financials.length,
      nombreTotalPatientsEnregistres: patients.length,
      medecins: doctors.map((u) => ({
        nom: u.fullName,
        specialite: u.doctorProfile!.specialty,
        grade: u.doctorProfile!.grade,
        departement: getDept(db, u.doctorProfile!.departmentId).name,
        disponibilite: u.doctorProfile!.availability,
      })),
      infirmiers: nurses.map((u) => ({
        nom: u.fullName,
        qualification: u.nurseProfile!.qualification,
        departement: getDept(db, u.nurseProfile!.departmentId).name,
        poste: u.nurseProfile!.shift,
      })),
      administration: admins.map((u) => ({
        nom: u.fullName,
        poste: u.adminProfile!.position,
      })),
      financiers: financials.map((u) => ({
        nom: u.fullName,
        titre: u.financialProfile!.title,
      })),
    };
  }

  if (canCommunicate) {
    contextPayload.communicationsInterServices = db.messages.slice(0, 10).map((m) => ({
      de: getDept(db, m.fromDepartmentId).name,
      vers: getDept(db, m.toDepartmentId).name,
      objet: m.subject,
      priorite: m.priority,
      statut: m.status,
    }));
  }

  if (canTransfer) {
    contextPayload.transfertsInterServices = db.transfers.map((t) => ({
      de: getDept(db, t.fromDepartmentId).name,
      vers: getDept(db, t.toDepartmentId).name,
      motif: t.reason,
      priorite: t.priority,
      statut: t.status,
    }));
  }

  if (canManageRbac) {
    contextPayload.resumeRbac = {
      nombreRoles: db.roles.length,
      nombrePermissions: db.permissions.length,
      roles: db.roles.map((r) => ({
        nom: r.name,
        code: r.code,
        nombrePermissions: r.permissionIds.length,
        nombreUtilisateurs: db.users.filter((u) => u.roleIds.includes(r.id)).length,
      })),
    };
  }

  if (canViewAllFolders) {
    contextPayload.dossiersMedicaux = db.users
      .filter((u) => u.patientProfile)
      .map((u) => ({
        patient: u.fullName,
        dossier: u.patientProfile!.folderNumber,
        groupeSanguin: u.patientProfile!.bloodType,
        allergies: u.patientProfile!.allergies,
        cas: db.medicalCases
          .filter((mc) => mc.patientId === u.patientProfile!.id)
          .map((mc) => ({
            numero: mc.caseNumber,
            titre: mc.title,
            service: getDept(db, mc.departmentId).name,
            statut: mc.status,
            priorite: mc.priority,
            diagnostic: mc.diagnosis,
            traitement: mc.treatmentPlan,
            medecins: mc.assignedDoctors.map((ad) => ({
              nom: findDoctorByProfileId(db, ad.doctorId)?.user.fullName,
              role: ad.roleInCase,
            })),
            dernieresConstantes: mc.vitalSignLogs[0] || null,
          })),
      }));
  } else if (canViewOwnFolder && user.patientProfile) {
    const pid = user.patientProfile.id;
    contextPayload.monDossierPersonnel = {
      dossier: user.patientProfile.folderNumber,
      groupeSanguin: user.patientProfile.bloodType,
      allergies: user.patientProfile.allergies,
      antecedents: user.patientProfile.chronicConditions,
      mesCas: db.medicalCases
        .filter((mc) => mc.patientId === pid)
        .map((mc) => ({
          numero: mc.caseNumber,
          titre: mc.title,
          service: getDept(db, mc.departmentId).name,
          statut: mc.status,
          diagnostic: mc.diagnosis,
          traitement: mc.treatmentPlan,
          medecins: mc.assignedDoctors.map((ad) => ({
            nom: findDoctorByProfileId(db, ad.doctorId)?.user.fullName,
            role: ad.roleInCase,
          })),
        })),
    };
  }

  if (canViewAllBilling) {
    contextPayload.factures = db.invoices.map((i) => ({
      numero: i.invoiceNumber,
      total: i.totalAmount,
      mutuelle: i.insuranceCovered,
      restePatient: i.patientResponsibility,
      statut: i.status,
    }));
  } else if (canViewOwnBilling && user.patientProfile) {
    contextPayload.mesFactures = db.invoices
      .filter((i) => i.patientId === user.patientProfile!.id)
      .map((i) => ({
        numero: i.invoiceNumber,
        description: i.description,
        total: i.totalAmount,
        mutuelle: i.insuranceCovered,
        resteAPayer: i.patientResponsibility,
        statut: i.status,
      }));
  }

  // Try live external/local API if the Admin configured Ollama, a local server, or an apiKey
  const isOllama =
    model.provider === "OLLAMA_LOCAL" || model.endpoint.includes("11434");
  const isLocalOpenAi =
    model.provider !== "LOCAL_DEMO" &&
    (model.endpoint.includes("localhost") ||
      model.endpoint.includes("127.0.0.1"));
  const hasApiKey = Boolean(model.apiKey && model.apiKey.trim().length > 0);
  const shouldCallLiveApi =
    model.provider !== "LOCAL_DEMO" &&
    (isOllama || isLocalOpenAi || hasApiKey);

  let liveErrorNote = "";

  const closedWorldOutOfScopeReply = () => ({
    reply: `🚫 **Hors périmètre E-HOSPIA** (modèle actif : **${model.name}**)\n\nJe suis strictement limité aux données de la plateforme **E-HOSPIA**. Je ne peux pas répondre aux questions externes.`,
    modelUsed: {
      id: model.id,
      name: model.name,
      modelId: model.modelId,
      provider: model.provider,
    },
    mode: "LOCAL_DEMO",
    rbacScope,
  });

  if (shouldCallLiveApi) {
    try {
      const systemMsg = `${db.aiSettings.hospitalSystemPrompt}
RÈGLES STRICTES OBLIGATOIRES (ASSISTANT MÉDICAL & HOSPITALIER E-HOSPIA) :
1. Tu es autorisé à répondre uniquement à deux types de demandes :
   (a) Les questions sur les données internes d'E-HOSPIA fournies ci-dessous (services, lits, effectifs, dossiers autorisés, factures).
   (b) Les questions générales de santé, médecine, pathologies, symptômes, prévention et soins cliniques (ex. diabète, hypertension, urgences, pédiatrie, obstétrique) avec un rappel de consultation médicale si nécessaire.
2. Si la question porte sur un sujet NON médical et NON lié à E-HOSPIA (ex. mathématiques, statistiques, programmation, sport, histoire, géographie, cuisine, météo), refuse poliment en répondant uniquement : "🚫 **Hors périmètre Médical & E-HOSPIA** : Je réponds uniquement aux questions de santé, médecine et aux données de la plateforme E-HOSPIA."
3. Pour les questions sur les données d'E-HOSPIA, utilise strictement les valeurs et totaux exacts pré-calculés du JSON ci-dessous (ex. nombreTotalMedecins, totalLitsOccupesHopital, totalLitsVidesDisponiblesHopital) sans jamais inventer de patients ou de données absentes.
4. Réponds dans la langue de la question (français ou anglais), en Markdown propre (titres, listes à puces \`-\`, **gras**), sans jamais utiliser de syntaxe LaTeX (\`$$\`, \`\\frac\`, \`\\sqrt\`).
Données internes E-HOSPIA autorisées pour ${user.fullName} (JSON RBAC filtré) :
${JSON.stringify(contextPayload)}`;

      const sanitizeLiveText = (text: string) => {
        if (/\$\$|\\frac|\\sqrt|\\sum/.test(text)) {
          return closedWorldOutOfScopeReply();
        }
        return {
          reply: text,
          modelUsed: {
            id: model.id,
            name: model.name,
            modelId: model.modelId,
            provider: model.provider,
          },
          mode: "LIVE_API",
          rbacScope,
        };
      };

      if (model.provider === "GOOGLE_GEMINI" && hasApiKey) {
        const endpointBase = model.endpoint.replace(/\/$/, "");
        const url = `${endpointBase}/models/${encodeURIComponent(model.modelId)}:generateContent?key=${encodeURIComponent(model.apiKey!)}`;
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: `${systemMsg}\n\nQuestion : ${prompt}` }],
              },
            ],
            generationConfig: { temperature: db.aiSettings.temperature },
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return sanitizeLiveText(text);
        } else {
          liveErrorNote = `HTTP ${resp.status}`;
        }
      } else if (isOllama) {
        const ollamaBase =
          model.endpoint
            .replace(/\/(v1|api\/chat|api\/generate)\/?$/, "")
            .replace(/\/$/, "") || "http://localhost:11434";
        const resp = await fetch(`${ollamaBase}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: model.modelId,
            stream: false,
            think: false,
            options: { temperature: db.aiSettings.temperature },
            messages: [
              { role: "system", content: systemMsg },
              { role: "user", content: prompt },
            ],
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          const text = data?.message?.content;
          if (text) return sanitizeLiveText(text);
        } else {
          const errText = await resp.text().catch(() => "");
          liveErrorNote = `Ollama HTTP ${resp.status}${errText ? ` (${errText.slice(0, 80)})` : ""}`;
        }
      } else {
        const endpointBase = model.endpoint.replace(/\/$/, "");
        const reqHeaders: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (hasApiKey) {
          reqHeaders.Authorization = `Bearer ${model.apiKey}`;
        }
        const resp = await fetch(`${endpointBase}/chat/completions`, {
          method: "POST",
          headers: reqHeaders,
          body: JSON.stringify({
            model: model.modelId,
            temperature: db.aiSettings.temperature,
            messages: [
              { role: "system", content: systemMsg },
              { role: "user", content: prompt },
            ],
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          const text = data?.choices?.[0]?.message?.content;
          if (text) return sanitizeLiveText(text);
        } else {
          liveErrorNote = `HTTP ${resp.status}`;
        }
      }
    } catch (err) {
      liveErrorNote =
        err instanceof Error ? err.message : "Connexion au serveur IA échouée";
    }
  }

  // Deterministic, rich Local Demo AI synthesis using strictly the RBAC-filtered JSON
  const lines: string[] = [];

  const isGreeting =
    /^(hi|hello|hey|bonjour|bonsoir|salut|coucou|yo)[!.\s?]*$/i.test(
      prompt.trim()
    );
  const isIdentityQuestion =
    /\b(what are you|who are you|what can you do|qui es[- ]tu|c'est quoi|que fais[- ]tu|aide|help)\b/i.test(
      prompt
    );

  if (isGreeting || isIdentityQuestion) {
    lines.push(
      `Bonjour **${user.fullName}** ! Je suis l'Assistant IA **E-HOSPIA** (modèle actif : **${model.name}** / \`${model.modelId}\`).`
    );
    lines.push(`Votre périmètre RBAC autorisé : **${rbacScope}**.`);
    lines.push(
      `Posez-moi une question précise sur vos données internes E-HOSPIA ou utilisez les suggestions ci-dessus.`
    );
  } else if (asksHospitalStaff && canViewDirectory) {
    const doctors = db.users.filter((u) => u.profileType === "DOCTOR" && u.doctorProfile);
    const nurses = db.users.filter((u) => u.profileType === "NURSE" && u.nurseProfile);
    lines.push(
      `**Effectifs hospitaliers E-HOSPIA :** ${doctors.length} médecins, ${nurses.length} infirmiers, ${db.users.filter((u) => u.profileType === "ADMIN").length} administrateur et ${db.users.filter((u) => u.profileType === "FINANCIAL").length} financier.`
    );
    lines.push(`\n**Liste des ${doctors.length} médecins :**`);
    for (const d of doctors) {
      lines.push(
        `- **${d.fullName}** — ${d.doctorProfile!.specialty} (${getDept(db, d.doctorProfile!.departmentId).name}) [${d.doctorProfile!.availability}]`
      );
    }
  } else if (
    /\b(diabet|diab[eè]te|hypertension|fever|fi[eè]vre|asthma|asthme|infection|pain|douleur|migraine|sympt|disease|maladie)\b/.test(
      q
    ) &&
    !mentionsSpecificPatientOrRecord &&
    !asksHospitalCapacity
  ) {
    if (/\b(diabet|diab[eè]te)\b/.test(q)) {
      lines.push(
        `**Symptômes fréquents du diabète (information médicale générale) :**\n- **Soif intense** (polydipsie) et bouche sèche\n- **Mictions fréquentes** (polyurie), notamment la nuit\n- **Fatigue inhabituelle** et somnolence\n- **Vision trouble** ou perte de poids inexpliquée (surtout diabète de type 1)\n- **Cicatrisation lente** des plaies ou infections récurrentes\n\n*En cas de signes aigus (nausées, vomissements, confusion, respiration rapide), consultez immédiatement le service des Urgences.*`
      );
    } else {
      lines.push(
        `En mode **Démo JSON local** (sans LLM connecté), mes réponses médicales détaillées sont limitées aux cas cliniques d'E-HOSPIA. Activez un modèle **Ollama** (ex. \`qwen3.5:4b\`) ou une clé API dans **Paramètres IA & Modèles** pour les questions médicales libres.`
      );
    }
  } else if (canViewOwnFolder && !canViewAllFolders && user.patientProfile) {
    const pid = user.patientProfile.id;
    const myCases = db.medicalCases.filter((mc) => mc.patientId === pid);
    const myInvoices = db.invoices.filter((i) => i.patientId === pid);

    if (/\b(facture|payer|reste|mutuelle|coût|cout|prix)\b/.test(q)) {
      const totalDue = myInvoices.reduce((s, i) => s + i.patientResponsibility, 0);
      lines.push(
        `Voici le récapitulatif de vos **${myInvoices.length} factures personnelles** :`
      );
      for (const inv of myInvoices) {
        lines.push(
          `• **${inv.invoiceNumber}** (${getDept(db, inv.departmentId).name}) : ${inv.totalAmount} € total — mutuelle ${inv.insuranceCovered} € — **reste à charge : ${inv.patientResponsibility} €** (*${inv.status}*).`
        );
      }
      lines.push(`\n**Total restant à votre charge :** ${totalDue} €.`);
    } else {
      lines.push(
        `Bonjour **${user.fullName}**, voici la synthèse claire de votre dossier **${user.patientProfile.folderNumber}** :`
      );
      lines.push(
        `• **Vigilance allergie :** ${user.patientProfile.allergies} | Groupe sanguin : **${user.patientProfile.bloodType}**.`
      );
      lines.push(`• **Vos ${myCases.length} cas médicaux en cours :**`);
      for (const mc of myCases) {
        const docs = mc.assignedDoctors
          .map(
            (ad) =>
              `${findDoctorByProfileId(db, ad.doctorId)?.user.fullName || "Médecin"} (${ad.roleInCase})`
          )
          .join(", ");
        lines.push(
          `  - **${mc.caseNumber} (${getDept(db, mc.departmentId).name})** — *${mc.title}* [${mc.status}]\n    Traitement : ${mc.treatmentPlan}\n    Médecins : ${docs}`
        );
      }
    }
  } else if (canViewAllFolders) {
    // Doctor or Nurse
    if (asksHospitalCapacity) {
      const total = db.departments.reduce((s, d) => s + d.totalBeds, 0);
      const occ = db.departments.reduce((s, d) => s + d.occupiedBeds, 0);
      const free = Math.max(0, total - occ);
      const alerts = db.departments.filter((d) => d.alertLevel !== "NORMAL");
      lines.push(
        `**État capacitaire des 8 départements :** ${occ}/${total} lits occupés (**${free} lits vides disponibles**).`
      );
      lines.push(
        `**Services en vigilance (${alerts.length}) :** ${alerts
          .map(
            (d) =>
              `${d.name} [${d.alertLevel} : ${Math.max(0, d.totalBeds - d.occupiedBeds)} lits libres]`
          )
          .join(" • ")}.`
      );
    } else if (/\b(yasmine|alaoui|101|102|103)\b/.test(q)) {
      const yPat = db.users.find((u) => u.patientProfile?.id === "pat-yasmine");
      const yCases = db.medicalCases.filter((mc) => mc.patientId === "pat-yasmine");
      lines.push(
        `**Synthèse multi-cas — ${yPat?.fullName} (${yPat?.patientProfile?.folderNumber}) :**`
      );
      lines.push(
        `⚠️ **Allergies critiques :** ${yPat?.patientProfile?.allergies} (à vérifier avant toute prescription d'antibiotique).`
      );
      for (const mc of yCases) {
        const lastVital = mc.vitalSignLogs[0];
        const docs = mc.assignedDoctors
          .map((ad) => findDoctorByProfileId(db, ad.doctorId)?.user.fullName)
          .join(", ");
        lines.push(
          `• **${mc.caseNumber} (${getDept(db, mc.departmentId).name} — ${mc.status})** : ${mc.title}. Équipe : ${docs}.${
            lastVital
              ? ` Dernières constantes : TA ${lastVital.bloodPressure}, FC ${lastVital.heartRate} bpm, SpO2 ${lastVital.oxygenSaturation}%.`
              : ""
          }`
        );
      }
    } else {
      const criticalCases = db.medicalCases.filter(
        (mc) => mc.status === "CRITIQUE" || mc.priority === "URGENCE_VITALE"
      );
      const pendingTr = db.transfers.filter((t) => t.status === "EN_ATTENTE");
      lines.push(
        `**Synthèse clinique active (${db.medicalCases.length} cas suivis, ${criticalCases.length} critiques) :**`
      );
      for (const mc of criticalCases) {
        const pat = findPatientByProfileId(db, mc.patientId);
        lines.push(
          `🚨 **${mc.caseNumber}** — ${pat?.user.fullName} (${getDept(db, mc.departmentId).name}) : *${mc.title}* — Diagnostic : ${mc.diagnosis}.`
        );
      }
      if (pendingTr.length > 0) {
        lines.push(
          `\n**Transferts inter-services en attente (${pendingTr.length}) :** ${pendingTr
            .map(
              (t) =>
                `${getDept(db, t.fromDepartmentId).name} → ${getDept(db, t.toDepartmentId).name} (${t.reason})`
            )
            .join(" | ")}`
        );
      }
    }
  } else if (canViewDepts) {
    // Administration (departments.view without folder.view_all)
    const total = db.departments.reduce((s, d) => s + d.totalBeds, 0);
    const occ = db.departments.reduce((s, d) => s + d.occupiedBeds, 0);
    const free = Math.max(0, total - occ);
    lines.push(
      `**Synthèse opérationnelle des 8 départements (Admin) :** ${occ}/${total} lits occupés et **${free} lits vides disponibles** (${Math.round((occ / total) * 100)}% d'occupation).`
    );
    for (const d of sortDepts(db.departments)) {
      lines.push(
        `• **${d.name}** [${d.alertLevel}] : ${d.occupiedBeds}/${d.totalBeds} occupés — **${Math.max(0, d.totalBeds - d.occupiedBeds)} lits vides**.`
      );
    }
  } else if (canViewAllBilling) {
    // Financial staff
    const total = db.invoices.reduce((s, i) => s + i.totalAmount, 0);
    const covered = db.invoices.reduce((s, i) => s + i.insuranceCovered, 0);
    const due = db.invoices.reduce((s, i) => s + i.patientResponsibility, 0);
    const pending = db.invoices.filter((i) => i.status === "EN_ATTENTE");
    lines.push(
      `**Analyse financière E-HOSPIA (${db.invoices.length} factures) :**\n• Total facturé : **${total} €**\n• Couvert CPAM / Mutuelles : **${covered} €**\n• Reste à charge patients : **${due} €**\n• Factures en attente d'encaissement (${pending.length}) : ${pending.map((i) => `${i.invoiceNumber} (${i.patientResponsibility} €)`).join(", ") || "Aucune"}.`
    );
  } else {
    lines.push("Bonjour ! Posez-moi une question sur votre espace autorisé.");
  }

  if (liveErrorNote) {
    lines.push(
      `\n⚠️ *Repli sur le moteur JSON local : le serveur configuré (\`${model.endpoint}\`) a renvoyé \`${liveErrorNote}\`.*`
    );
  }

  return {
    reply: lines.join("\n"),
    modelUsed: {
      id: model.id,
      name: model.name,
      modelId: model.modelId,
      provider: model.provider,
    },
    mode: "LOCAL_DEMO",
    rbacScope,
  };
}
