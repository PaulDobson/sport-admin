import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { createEfcTrainingDeps } from "@/infrastructure/composition/efc-training-composition";
import { createInstructorOperationsDeps } from "@/infrastructure/composition/instructor-operations-composition";
import { EFC_PERIOD_LABELS } from "@/domain/efc-training";

export async function GET(req: NextRequest) {
  try {
    const membership = await requireOperationalMembership();
    const athleteId = req.nextUrl.searchParams.get("athleteId");
    if (!athleteId) return NextResponse.json({ error: "athleteId requerido" }, { status: 400 });

    const [ops, efc] = await Promise.all([
      createInstructorOperationsDeps(),
      createEfcTrainingDeps(),
    ]);

    const [student, profile, tests, oneRms] = await Promise.all([
      ops.students.findAdministrationRowById(membership.tenantId, athleteId),
      efc.profiles.findByAthleteId(athleteId, membership.tenantId),
      efc.profiles.findTestsByAthleteId(athleteId, membership.tenantId, 50),
      efc.oneRm.findByAthleteId(athleteId, membership.tenantId),
    ]);

    if (!student) return NextResponse.json({ error: "Deportista no encontrado" }, { status: 404 });

    const wb = new ExcelJS.Workbook();
    wb.creator = "Sport Admin — EFC Module";
    wb.created = new Date();

    // ── Sheet 1: Perfil ──────────────────────────────────────────────────
    const profileSheet = wb.addWorksheet("Perfil EFC");
    profileSheet.columns = [
      { header: "Campo", key: "campo", width: 28 },
      { header: "Valor", key: "valor", width: 30 },
    ];
    profileSheet.addRows([
      { campo: "Nombre", valor: student.fullName },
      { campo: "Fecha de nacimiento", valor: student.birthDate ?? "—" },
      { campo: "Género", valor: student.gender ?? "—" },
      { campo: "Estatura (cm)", valor: student.heightCm ?? "—" },
      { campo: "Peso (kg)", valor: student.weightKg ?? "—" },
      { campo: "FC Reposo (bpm)", valor: profile?.fcRest ?? "—" },
      { campo: "Fumador", valor: profile ? (profile.isSmoker ? "Sí" : "No") : "—" },
      { campo: "Período EFC actual", valor: profile ? EFC_PERIOD_LABELS[profile.efcPeriod] : "—" },
    ]);

    // ── Sheet 2: Tests ───────────────────────────────────────────────────
    const testsSheet = wb.addWorksheet("Tests Físicos");
    testsSheet.columns = [
      { header: "Fecha", key: "fecha", width: 14 },
      { header: "Abs 1min", key: "abs1min", width: 12 },
      { header: "Seat & Reach (cm)", key: "seatAndReachCm", width: 20 },
      { header: "Dominadas", key: "pullUps", width: 14 },
      { header: "Flex-ext brazos 1min", key: "pushUps1min", width: 22 },
      { header: "10x5m (seg)", key: "sprint10x5Sec", width: 14 },
      { header: "Cintura (cm)", key: "waistCm", width: 14 },
      { header: "Cooper (m)", key: "enduranceMeters", width: 14 },
    ];
    for (const t of tests) {
      testsSheet.addRow({
        fecha: t.evaluationDate,
        abs1min: t.abs1min ?? "",
        seatAndReachCm: t.seatAndReachCm ?? "",
        pullUps: t.pullUps ?? "",
        pushUps1min: t.pushUps1min ?? "",
        sprint10x5Sec: t.sprint10x5Sec ?? "",
        waistCm: t.waistCm ?? "",
        enduranceMeters: t.enduranceMeters ?? "",
      });
    }

    // ── Sheet 3: 1RM ─────────────────────────────────────────────────────
    const oneRmSheet = wb.addWorksheet("Registros 1RM");
    oneRmSheet.columns = [
      { header: "Fecha", key: "fecha", width: 14 },
      { header: "Ejercicio", key: "ejercicio", width: 20 },
      { header: "Peso levantado (kg)", key: "weightKg", width: 20 },
      { header: "Reps", key: "repsPerformed", width: 10 },
      { header: "RIR", key: "rir", width: 8 },
      { header: "1RM Epley", key: "oneRmEpley", width: 14 },
      { header: "1RM Brzycki", key: "oneRmBrzycki", width: 14 },
      { header: "1RM Promedio", key: "oneRmAverage", width: 14 },
    ];
    for (const r of oneRms) {
      oneRmSheet.addRow({
        fecha: r.evaluationDate, ejercicio: r.exercise,
        weightKg: r.weightKg, repsPerformed: r.repsPerformed, rir: r.rir,
        oneRmEpley: r.oneRmEpley, oneRmBrzycki: r.oneRmBrzycki, oneRmAverage: r.oneRmAverage,
      });
    }

    const buffer = await wb.xlsx.writeBuffer();
    const filename = `EFC_${student.fullName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
