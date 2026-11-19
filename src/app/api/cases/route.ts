import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  forbiddenResponse,
  getRequestUser,
  hasPermission,
  unauthorizedResponse,
} from "@/lib/rbac";

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.CASE_CREATE)) {
      return forbiddenResponse(PERMISSIONS.CASE_CREATE);
    }

    const body = await request.json();
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
      return NextResponse.json(
        {
          error:
            "Patient, service, médecin référent et intitulé du cas sont requis",
        },
        { status: 400 }
      );
    }

    const count = await prisma.medicalCase.count();
    const caseNumber = `CAS-2026-${101 + count}`;

    const uniqueCoDocs = Array.from(
      new Set((coDoctorIds || []).filter((id) => id && id !== leadDoctorId))
    );

    const createdCase = await prisma.medicalCase.create({
      data: {
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
        assignedDoctors: {
          create: [
            { doctorId: leadDoctorId, roleInCase: "Médecin Référent" },
            ...uniqueCoDocs.map((docId) => ({
              doctorId: docId,
              roleInCase: "Médecin Consultant",
            })),
          ],
        },
        clinicalNotes: {
          create: [
            {
              authorUserId: user.id,
              authorName: user.fullName,
              authorRole: user.roleNames.join(" / ") || user.profileType,
              noteType: "OBSERVATION",
              content: `Ouverture du cas médical : ${title.trim()}.`,
            },
          ],
        },
      },
      include: {
        department: true,
        leadDoctor: {
          include: {
            user: {
              select: { id: true, fullName: true, email: true, avatarColor: true },
            },
          },
        },
        assignedDoctors: {
          include: {
            doctor: {
              include: {
                user: {
                  select: { id: true, fullName: true, email: true, avatarColor: true },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ medicalCase: createdCase }, { status: 201 });
  } catch (error) {
    console.error("Cases POST error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'ouverture du cas médical" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) return unauthorizedResponse();
    const body = await request.json();
    const { action } = body as { action: string };

    if (action === "update_case") {
      if (!hasPermission(user, PERMISSIONS.CASE_EDIT)) {
        return forbiddenResponse(PERMISSIONS.CASE_EDIT);
      }
      const { medicalCaseId, status, priority, diagnosis, treatmentPlan, roomBed } =
        body as {
          medicalCaseId: string;
          status?: string;
          priority?: string;
          diagnosis?: string;
          treatmentPlan?: string;
          roomBed?: string;
        };

      const updated = await prisma.medicalCase.update({
        where: { id: medicalCaseId },
        data: {
          ...(status
            ? { status, closedAt: status === "CLOTURE" ? new Date() : null }
            : {}),
          ...(priority ? { priority } : {}),
          ...(diagnosis !== undefined ? { diagnosis } : {}),
          ...(treatmentPlan !== undefined ? { treatmentPlan } : {}),
          ...(roomBed !== undefined ? { roomBed } : {}),
        },
      });
      return NextResponse.json({ medicalCase: updated });
    }

    if (action === "assign_doctor") {
      if (!hasPermission(user, PERMISSIONS.CASE_ASSIGN_DOCTOR)) {
        return forbiddenResponse(PERMISSIONS.CASE_ASSIGN_DOCTOR);
      }
      const { medicalCaseId, doctorId, roleInCase } = body as {
        medicalCaseId: string;
        doctorId: string;
        roleInCase?: string;
      };
      if (!medicalCaseId || !doctorId) {
        return NextResponse.json(
          { error: "Cas médical et médecin requis" },
          { status: 400 }
        );
      }

      const assignment = await prisma.caseDoctorAssignment.upsert({
        where: {
          medicalCaseId_doctorId: { medicalCaseId, doctorId },
        },
        create: {
          medicalCaseId,
          doctorId,
          roleInCase: roleInCase?.trim() || "Médecin Spécialiste Consultant",
        },
        update: {
          roleInCase: roleInCase?.trim() || "Médecin Spécialiste Consultant",
        },
        include: {
          doctor: {
            include: {
              user: {
                select: { id: true, fullName: true, email: true, avatarColor: true },
              },
              department: true,
            },
          },
        },
      });

      return NextResponse.json({ assignment });
    }

    if (action === "remove_doctor") {
      if (!hasPermission(user, PERMISSIONS.CASE_ASSIGN_DOCTOR)) {
        return forbiddenResponse(PERMISSIONS.CASE_ASSIGN_DOCTOR);
      }
      const { medicalCaseId, doctorId } = body as {
        medicalCaseId: string;
        doctorId: string;
      };
      const medicalCase = await prisma.medicalCase.findUnique({
        where: { id: medicalCaseId },
      });
      if (medicalCase?.leadDoctorId === doctorId) {
        return NextResponse.json(
          { error: "Impossible de retirer le médecin référent principal" },
          { status: 400 }
        );
      }
      await prisma.caseDoctorAssignment.deleteMany({
        where: { medicalCaseId, doctorId },
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "add_note") {
      if (!hasPermission(user, PERMISSIONS.CLINICAL_NOTE_CREATE)) {
        return forbiddenResponse(PERMISSIONS.CLINICAL_NOTE_CREATE);
      }
      const { medicalCaseId, noteType, content, prescriptionDetails } = body as {
        medicalCaseId: string;
        noteType?: string;
        content: string;
        prescriptionDetails?: string;
      };
      if (!medicalCaseId || !content?.trim()) {
        return NextResponse.json(
          { error: "Contenu de la note requis" },
          { status: 400 }
        );
      }

      const canWritePrescription = hasPermission(user, PERMISSIONS.CASE_EDIT);
      const effectiveNoteType = canWritePrescription
        ? noteType || "OBSERVATION"
        : "OBSERVATION";
      const effectivePrescription = canWritePrescription
        ? prescriptionDetails?.trim() || null
        : null;

      const note = await prisma.clinicalNote.create({
        data: {
          medicalCaseId,
          authorUserId: user.id,
          authorName: user.fullName,
          authorRole: user.roleNames.join(" / ") || user.profileType,
          noteType: effectiveNoteType,
          content: content.trim(),
          prescriptionDetails: effectivePrescription,
        },
      });
      return NextResponse.json({ note }, { status: 201 });
    }

    if (action === "add_vitals") {
      if (!hasPermission(user, PERMISSIONS.VITALS_RECORD)) {
        return forbiddenResponse(PERMISSIONS.VITALS_RECORD);
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
      if (!medicalCaseId || !bloodPressure) {
        return NextResponse.json(
          { error: "Constantes vitales incomplètes" },
          { status: 400 }
        );
      }

      const vital = await prisma.vitalSignLog.create({
        data: {
          medicalCaseId,
          recordedByName: user.fullName,
          bloodPressure,
          heartRate: Number(heartRate) || 75,
          temperature: Number(temperature) || 37.0,
          oxygenSaturation: Number(oxygenSaturation) || 98,
          notes: notes?.trim() || null,
        },
      });
      return NextResponse.json({ vital }, { status: 201 });
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (error) {
    console.error("Cases PATCH error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du cas médical" },
      { status: 500 }
    );
  }
}
