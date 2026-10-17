import Link from "next/link";
import { CreditCard, Eye, Mail, Pencil, Phone } from "lucide-react";
import type { StudentAdministrationRow } from "@/application/instructor-operations/ports/student-repository-port";
import { Avatar, StatusBadge, ToneBadge } from "@/presentation/components/primitives";
import { studentTaskHref, studentLinkClass, type StudentListQuery } from "@/presentation/navigation/student-navigation";
import { AssignMembershipSheet } from "../finance/assign-membership-sheet";
import { StudentArchiveButton } from "./student-archive-button";

export function StudentStatus({ status }: { status: StudentAdministrationRow["status"] }) {
  return <StatusBadge tone={status === "active" ? "success" : "neutral"}>{status === "active" ? "Activo" : "Archivado"}</StatusBadge>;
}

export function StudentContact({ student }: { student: Pick<StudentAdministrationRow, "contactPhone" | "contactEmail"> }) {
  return (
    <div className="grid min-w-0 gap-1 text-sm text-muted-foreground">
      {student.contactPhone ? <p className="flex items-start gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span className="break-all">{student.contactPhone}</span></p> : null}
      {student.contactEmail ? <p className="flex items-start gap-2"><Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span className="break-all">{student.contactEmail}</span></p> : null}
      {!student.contactPhone && !student.contactEmail ? <p>Sin contacto registrado</p> : null}
    </div>
  );
}

const iconAction = "inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

function AssignAction({ student, compact }: { student: StudentAdministrationRow; compact: boolean }) {
  return (
    <AssignMembershipSheet
      initialStudent={{ id: student.id, fullName: student.fullName }}
      trigger={compact ? <CreditCard className="h-4 w-4" aria-hidden="true" /> : <><CreditCard className="h-4 w-4" aria-hidden="true" />Asignar plan</>}
      triggerLabel={`Asignar plan a ${student.fullName}`}
      triggerClassName={compact ? `${iconAction} hover:text-primary` : `${studentLinkClass} text-primary`}
    />
  );
}

function StudentActions({ student, query, canManage, canAssign, compact = false }: { student: StudentAdministrationRow; query: StudentListQuery; canManage: boolean; canAssign: boolean; compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center justify-end gap-0.5">
        {canAssign ? <AssignAction student={student} compact /> : null}
        <Link href={studentTaskHref(`/dashboard/students/${student.id}`, query)} aria-label={`Ver ficha de ${student.fullName}`} title="Ver ficha" className={iconAction}><Eye className="h-4 w-4" aria-hidden="true" /></Link>
        {canManage ? <Link href={studentTaskHref(`/dashboard/students/${student.id}/edit`, query)} aria-label={`Editar ${student.fullName}`} title="Editar" className={`${iconAction} hover:text-primary`}><Pencil className="h-4 w-4" aria-hidden="true" /></Link> : null}
        {canManage && student.status === "active" ? <StudentArchiveButton studentId={student.id} studentName={student.fullName} compact /> : null}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-start gap-2">
      {canAssign ? <AssignAction student={student} compact={false} /> : null}
      <Link href={studentTaskHref(`/dashboard/students/${student.id}`, query)} aria-label={`Ver ficha de ${student.fullName}`} className={studentLinkClass}><Eye className="h-4 w-4" aria-hidden="true" />Ver ficha</Link>
      {canManage ? <Link href={studentTaskHref(`/dashboard/students/${student.id}/edit`, query)} aria-label={`Editar ${student.fullName}`} className={studentLinkClass}><Pencil className="h-4 w-4" aria-hidden="true" />Editar</Link> : null}
      {canManage && student.status === "active" ? <StudentArchiveButton studentId={student.id} studentName={student.fullName} /> : null}
    </div>
  );
}

function formatDate(value: Date) {
  return value.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const headCell = "px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

/** `studentsWithMembership` lists active students that already hold a current membership; omit it to hide plan assignment. */
export function StudentList({ rows, query, canManage, studentsWithMembership }: { rows: StudentAdministrationRow[]; query: StudentListQuery; canManage: boolean; studentsWithMembership?: string[] }) {
  const withMembership = studentsWithMembership ? new Set(studentsWithMembership) : null;
  const needsPlan = (student: StudentAdministrationRow) => Boolean(canManage && withMembership && student.status === "active" && !withMembership.has(student.id));
  return (
    <>
      <ul aria-label="Alumnos" className="divide-y divide-border md:hidden">
        {rows.map(student => (
          <li key={student.id} className="space-y-3 p-4">
            <div className="flex items-center gap-3">
              <Avatar name={student.fullName} src={student.photoUrl} />
              <div className="min-w-0 flex-1">
                <Link className="flex min-h-11 items-center font-semibold [overflow-wrap:anywhere] hover:text-primary" href={studentTaskHref(`/dashboard/students/${student.id}`, query)}>{student.fullName}</Link>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1"><StudentStatus status={student.status} />{needsPlan(student) ? <ToneBadge tone="warning">Sin plan</ToneBadge> : null}</div>
            </div>
            <StudentContact student={student} />
            <StudentActions student={student} query={query} canManage={canManage} canAssign={needsPlan(student)} />
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <caption className="sr-only">Alumnos de la academia activa</caption>
          <thead className="border-b border-border">
            <tr>
              <th scope="col" className={`${headCell} w-14 pl-5`}>Foto</th>
              <th scope="col" className={headCell}>Alumno</th>
              <th scope="col" className={headCell}>Contacto</th>
              <th scope="col" className={`${headCell} hidden lg:table-cell`}>Registro</th>
              <th scope="col" className={`${headCell} hidden lg:table-cell`}>Nacimiento</th>
              <th scope="col" className={headCell}>Estado</th>
              <th scope="col" className={`${headCell} pr-5 text-right`}>Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map(student => (
              <tr key={student.id} className="transition-colors hover:bg-surface-raised/40">
                <td className="py-2.5 pl-5 pr-3"><Avatar name={student.fullName} src={student.photoUrl} size="sm" /></td>
                <td className="px-3 py-2.5">
                  <Link className="font-semibold [overflow-wrap:anywhere] hover:text-primary" href={studentTaskHref(`/dashboard/students/${student.id}`, query)}>{student.fullName}</Link>
                </td>
                <td className="px-3 py-2.5">
                  <div className="grid min-w-0 gap-0.5 text-xs text-muted-foreground">
                    {student.contactEmail ? <span className="truncate">{student.contactEmail}</span> : null}
                    {student.contactPhone ? <span className="truncate">{student.contactPhone}</span> : null}
                    {!student.contactPhone && !student.contactEmail ? <span>Sin contacto registrado</span> : null}
                  </div>
                </td>
                <td className="metric-number hidden px-3 py-2.5 text-xs text-muted-foreground lg:table-cell">{formatDate(student.createdAt)}</td>
                <td className="metric-number hidden px-3 py-2.5 text-xs text-muted-foreground lg:table-cell">{student.birthDate ?? "—"}</td>
                <td className="px-3 py-2.5"><div className="flex flex-wrap items-center gap-1"><StudentStatus status={student.status} />{needsPlan(student) ? <ToneBadge tone="warning">Sin plan</ToneBadge> : null}</div></td>
                <td className="py-2.5 pl-3 pr-4"><StudentActions student={student} query={query} canManage={canManage} canAssign={needsPlan(student)} compact /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
