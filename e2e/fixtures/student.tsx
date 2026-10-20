import { createRoot } from "react-dom/client";
import Link from "next/link";
import { AppShell } from "../../src/presentation/components/app-shell";
import StudentsPage from "../../src/app/dashboard/students/page";
import StudentDetailPage from "../../src/app/dashboard/students/[studentId]/page";
import NewStudentPage from "../../src/app/dashboard/students/new/page";
import StudentEditPage from "../../src/app/dashboard/students/[studentId]/edit/page";
import "../../src/presentation/styles/globals.css";
import "@fontsource-variable/manrope";

const searchParams = Promise.resolve(Object.fromEntries(new URLSearchParams(location.search)));
const match = location.pathname.match(/\/students\/([^/]+)/);
const params = Promise.resolve({ studentId: match?.[1] ?? "" });
async function renderFixture() {
const page = location.pathname.endsWith("/new") ? await NewStudentPage({ searchParams })
  : location.pathname.endsWith("/edit") ? await StudentEditPage({ params, searchParams })
  : match ? await StudentDetailPage({ params, searchParams })
  : await StudentsPage({ searchParams });

createRoot(document.getElementById("root")!).render(
  <AppShell sidebarHeader={<strong>Sport Admin</strong>}
    navigation={<Link href="/dashboard/students" className="flex min-h-11 items-center px-3">Alumnos</Link>}
    topbar={<p>Academia Norte · Instructor</p>}
    mobileNavigation={<Link href="/dashboard/students" className="flex min-h-11 items-center justify-center">Alumnos</Link>}>
    {page}
  </AppShell>,
);
}
void renderFixture();
