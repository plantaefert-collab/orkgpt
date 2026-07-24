export async function resolvePostAuthDestination(
  _userId: string,
  _opts?: { isNewSignup?: boolean; explicitRedirect?: string | null },
): Promise<string> {
  return "/inicio";
}
