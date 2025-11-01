export type Tenant = "primary" | "secondary";

function normalizeHost(host?: string | null): string {
  return (host || "")?.split(":")[0]?.toLowerCase() ?? "";
}

export function getTenantFromHost(host: string): Tenant {
  const normalized = normalizeHost(host);
  const secondary = normalizeHost(process.env.SECONDARY_DOMAIN || process.env.NEXT_PUBLIC_SECONDARY_DOMAIN);

  if (secondary && normalized === secondary) return "secondary";
  return "primary";
}

export function isSecondaryHost(host: string): boolean {
  return getTenantFromHost(host) === "secondary";
}

export function isSecondaryClient(): boolean {
  if (typeof window === "undefined") return false;
  const current = normalizeHost(window.location.hostname);
  const secondary = normalizeHost(process.env.NEXT_PUBLIC_SECONDARY_DOMAIN || process.env.SECONDARY_DOMAIN);
  return !!secondary && current === secondary;
}


