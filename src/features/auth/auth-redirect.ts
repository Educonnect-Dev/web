export type UserRole = "student" | "teacher";

export function getPostAuthRoute(role: UserRole, hasTeachingLevel: boolean): string {
  if (role === "student") {
    return "/dashboard/student";
  }
  if (!hasTeachingLevel) {
    return "/onboarding/teacher-profile";
  }
  return "/dashboard/teacher";
}
