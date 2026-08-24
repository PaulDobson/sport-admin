import { createSupabaseServerClient } from "@/infrastructure/supabase/server-client";
import { SupabaseInstructorDayRepository } from "@/infrastructure/instructor-operations/supabase-instructor-day-repository";
import { SupabaseStudentRepository } from "@/infrastructure/instructor-operations/supabase-student-repository";

export async function createInstructorOperationsDeps() {
  const client = await createSupabaseServerClient();
  return {
    instructorDay: new SupabaseInstructorDayRepository(client),
    students: new SupabaseStudentRepository(client),
  };
}
