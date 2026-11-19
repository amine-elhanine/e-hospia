export type ProfileType = "DOCTOR" | "NURSE" | "ADMIN" | "FINANCIAL" | "PATIENT";

export interface RoleSummary {
  id: string;
  code: string;
  name: string;
  description?: string;
  profileType?: string;
}

export interface PermissionItem {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
}

export interface DepartmentSummary {
  id: string;
  code: string;
  name: string;
  description: string;
  floor: string;
  phoneExtension: string;
  totalBeds: number;
  occupiedBeds: number;
  alertLevel: "NORMAL" | "TENSION" | "CRITIQUE" | string;
  color: string;
  _count?: {
    doctors?: number;
    nurses?: number;
    medicalCases: number;
    incomingMessages: number;
    incomingTransfers: number;
  };
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  avatarColor: string;
  profileType: ProfileType | string;
  isActive: boolean;
  roleCodes: string[];
  roleNames: string[];
  effectivePermissions: string[];
  doctorProfile?: {
    id: string;
    departmentId: string;
    rppsNumber: string;
    specialty: string;
    grade: string;
    availability: string;
    bio: string;
    department: DepartmentSummary;
  } | null;
  nurseProfile?: {
    id: string;
    departmentId: string;
    matricule: string;
    shift: string;
    qualification: string;
    department: DepartmentSummary;
  } | null;
  adminProfile?: {
    id: string;
    matricule: string;
    position: string;
    office: string;
    scope: string;
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

export interface UserSwitchOption {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  avatarColor: string;
  profileType: ProfileType | string;
  isActive: boolean;
  roles: RoleSummary[];
  doctorProfile?: AuthUser["doctorProfile"];
  nurseProfile?: AuthUser["nurseProfile"];
  adminProfile?: AuthUser["adminProfile"];
  financialProfile?: AuthUser["financialProfile"];
  patientProfile?: AuthUser["patientProfile"];
}

export interface PatientCaseSummary {
  id: string;
  caseNumber: string;
  title: string;
  problemCategory: string;
  status: string;
  priority: string;
  roomBed?: string | null;
  openedAt: string;
  department: { id: string; name: string; color: string };
  leadDoctor: {
    specialty: string;
    user: { fullName: string };
  };
  assignedDoctors: Array<{
    roleInCase: string;
    doctor: {
      specialty: string;
      user: { fullName: string };
      department: { name: string };
    };
  }>;
  _count: {
    clinicalNotes: number;
    vitalSignLogs: number;
  };
}

export interface PatientInvoiceSummary {
  id: string;
  invoiceNumber: string;
  description: string;
  totalAmount: number;
  insuranceCovered: number;
  patientResponsibility: number;
  status: string;
  issuedAt: string;
  department: { name: string; color: string };
}

export interface RoleContext {
  patientFolderSummary?: {
    medicalCases: PatientCaseSummary[];
    invoices: PatientInvoiceSummary[];
  } | null;
  billingSummary?: {
    totalBilled: number;
    totalCovered: number;
    totalPatientResponsibility: number;
    pendingCount: number;
    paidCount: number;
    invoiceCount: number;
  } | null;
}

export const PROFILE_TYPE_LABELS: Record<string, string> = {
  DOCTOR: "Médecin",
  NURSE: "Infirmier(e)",
  ADMIN: "Administration",
  FINANCIAL: "Financier",
  PATIENT: "Patient",
};

export const PROFILE_TYPE_BADGES: Record<string, string> = {
  DOCTOR: "bg-sky-100 text-sky-800 border-sky-200",
  NURSE: "bg-teal-100 text-teal-800 border-teal-200",
  ADMIN: "bg-slate-800 text-white border-slate-700",
  FINANCIAL: "bg-emerald-100 text-emerald-800 border-emerald-200",
  PATIENT: "bg-rose-100 text-rose-800 border-rose-200",
};

export const ALERT_LEVEL_STYLES: Record<string, string> = {
  NORMAL: "bg-emerald-50 text-emerald-700 border-emerald-200",
  TENSION: "bg-amber-50 text-amber-700 border-amber-200",
  CRITIQUE: "bg-red-50 text-red-700 border-red-200",
};

export const CASE_STATUS_STYLES: Record<string, string> = {
  ACTIF: "bg-sky-100 text-sky-800 border-sky-200",
  EN_OBSERVATION: "bg-amber-100 text-amber-800 border-amber-200",
  CRITIQUE: "bg-red-100 text-red-800 border-red-200",
  CLOTURE: "bg-slate-100 text-slate-600 border-slate-200",
};

export const PRIORITY_STYLES: Record<string, string> = {
  NORMALE: "bg-slate-100 text-slate-700",
  HAUTE: "bg-amber-100 text-amber-800",
  URGENTE: "bg-orange-100 text-orange-800",
  URGENCE_VITALE: "bg-red-600 text-white",
  VITALE: "bg-red-600 text-white",
  CRITIQUE: "bg-red-600 text-white",
};

export interface AiModelConfig {
  id: string;
  name: string;
  provider:
    | "LOCAL_DEMO"
    | "GOOGLE_GEMINI"
    | "OPENAI_COMPATIBLE"
    | "OLLAMA_LOCAL"
    | string;
  modelId: string;
  endpoint: string;
  apiKey?: string;
  description: string;
  addedBy: string;
  createdAt: string;
}

export interface AiSettings {
  activeModelId: string;
  hospitalSystemPrompt: string;
  temperature: number;
  models: AiModelConfig[];
}

export interface AiPublicConfig {
  activeModel: Omit<AiModelConfig, "apiKey"> | null;
  hospitalSystemPrompt: string;
  temperature: number;
  models?: AiModelConfig[];
}

export const CATEGORY_LABELS: Record<string, string> = {
  DEPARTEMENTS: "Départements & Inter-Services",
  DOSSIER_MEDICAL: "Dossiers Médicaux & Cas",
  SOINS_CLINIQUES: "Soins Cliniques & Constantes",
  PROFILS: "Annuaire & Profils",
  FINANCES: "Finances & Facturation",
  SECURITE_RBAC: "Sécurité & RBAC",
  INTELLIGENCE_ARTIFICIELLE: "Intelligence Artificielle",
};

export function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}
