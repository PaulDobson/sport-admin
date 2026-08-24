import { DomainError, ValidationError } from "@/domain/shared/errors";

/** Maps a thrown error to a safe, user-facing message for Server Action state. */
export function formatActionError(error: unknown): string {
  if (error instanceof ValidationError) {
    return error.issues.map((issue) => issue.message).join(" ");
  }
  if (error instanceof DomainError) {
    return error.message;
  }
  console.error("Unexpected action error", error);
  return "Something went wrong. Please try again.";
}
