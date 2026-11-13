import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { createEfcTrainingDeps } from "@/infrastructure/composition/efc-training-composition";
import { createInstructorOperationsDeps } from "@/infrastructure/composition/instructor-operations-composition";
import {
  EFC_PERIOD_LABELS,
  MICROCYCLE_TYPE_LABELS,
  INTENSITY_LABELS,
  computeFullMacrocycleDistribution,
} from "@/domain/efc-training";

function formatHHMM(min: number) {
  return `${Math.floor(min / 60)}h ${Math.round(min % 60).toString().padStart(2, "0")}m`;
}

export async function GET(req: NextRequest) {
  try {
    const membership = await requireOperationalMembership();
    const macrocycleId = req.nextUrl.searchParams.get("macrocycleId");
    if (!macrocycleId) return NextResponse.json({ error: "macrocycleId requerido" }, { status: 400 });

    const [ops, efc] = await Promise.all([
      createInstructorOperationsDeps(),
      createEfcTrainingDeps(),
    ]);

    const macrocycle = await efc.macrocycles.findById(macrocycleId, membership.tenantId);
    if (!macrocycle) return NextResponse.json({ error: "Macrociclo no encontrado" }, { status: 404 });

    const [microcycles, student] = await Promise.all([
      efc.microcycles.findByMacrocycleId(macrocycleId),
      ops.students.findAdministrationRowById(membership.tenantId, macrocycle.athleteId),
    ]);

    // Compute distribution
    const dist = computeFullMacrocycleDistribution({
      startDate: macrocycle.startDate,
      competitionDate: macrocycle.competitionDate,
      hoursPerSession: macrocycle.hoursPerSession,
      trainingDaysPerWeek: macrocycle.trainingDaysPerWeek,
      sessionsPerDay: macrocycle.sessionsPerDay,
      ePercentage: macrocycle.ePercentage,
      fPercentage: macrocycle.fPercentage,
      cPercentage: macrocycle.cPercentage,
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = "Sport Admin — EFC Module";
    wb.created = new Date();

    // ── Sheet 1: Resumen macrociclo ───────────────────────────────────────
    const summarySheet = wb.addWorksheet("Resumen Macrociclo");
    summarySheet.columns = [{ header: "Campo", key: "campo", width: 32 }, { header: "Valor", key: "valor", width: 25 }];
    summarySheet.addRows([
      { campo: "Deportista", valor: student?.fullName ?? macrocycle.athleteId },
      { campo: "Fecha de inicio", valor: macrocycle.startDate },
      { campo: "Fecha de competencia", valor: macrocycle.competitionDate },
      { campo: "Semanas totales", valor: dist.totalWeeks },
      { campo: "Horas totales", valor: formatHHMM(dist.totalMinutes) },
      { campo: `Estructura (${macrocycle.ePercentage}%)`, valor: formatHHMM(dist.estructuraMinutes) },
      { campo: `Función (${macrocycle.fPercentage}%)`, valor: formatHHMM(dist.funcionMinutes) },
      { campo: `Cognición (${macrocycle.cPercentage}%)`, valor: formatHHMM(dist.cognicionMinutes) },
      { campo: "Horas/sesión", valor: macrocycle.hoursPerSession },
      { campo: "Días/semana", valor: macrocycle.trainingDaysPerWeek },
      { campo: "Sesiones/día", valor: macrocycle.sessionsPerDay },
      { campo: "Justificación", valor: macrocycle.justification ?? "—" },
    ]);

    // ── Sheet 2: Microciclos ──────────────────────────────────────────────
    const mcSheet = wb.addWorksheet("Microciclos");
    mcSheet.columns = [
      { header: "Semana", key: "semana", width: 10 },
      { header: "Tipo", key: "tipo", width: 16 },
      { header: "Intensidad", key: "intensidad", width: 14 },
      { header: "Objetivo", key: "objetivo", width: 40 },
    ];
    for (const mc of microcycles) {
      mcSheet.addRow({
        semana: mc.weekNumber,
        tipo: `${mc.microcycleType} — ${MICROCYCLE_TYPE_LABELS[mc.microcycleType]}`,
        intensidad: `${mc.intensityTarget} — ${INTENSITY_LABELS[mc.intensityTarget]}`,
        objetivo: mc.objective,
      });
    }

    // ── Nota metodológica ─────────────────────────────────────────────────
    const notaSheet = wb.addWorksheet("Nota Metodológica");
    notaSheet.getCell("A1").value = "AVISO IMPORTANTE";
    notaSheet.getCell("A2").value = "Los porcentajes de distribución EFC (Estructura/Función/Cognición) son orientativos y no constituyen prescripción científica validada.";
    notaSheet.getCell("A3").value = "No representan una receta universal. Deben adaptarse al deportista, el calendario y los recursos disponibles.";
    notaSheet.getCell("A4").value = `Generado: ${new Date().toLocaleString("es-CL")}`;

    const buffer = await wb.xlsx.writeBuffer();
    const filename = `Macrociclo_EFC_${macrocycle.startDate}_${macrocycle.competitionDate}.xlsx`;

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
