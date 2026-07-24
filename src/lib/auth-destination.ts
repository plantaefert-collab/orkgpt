export async function resolvePostAuthDestination(
  _userId: string,
  opts?: { isNewSignup?: boolean; explicitRedirect?: string | null },
): Promise<string> {
  if (opts?.explicitRedirect) return opts.explicitRedirect;
  return "/inicio";
}
