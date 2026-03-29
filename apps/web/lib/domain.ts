// Single-domain architecture — tenant detection removed.
// All users are on the primary domain.

export type Tenant = "primary";

export function getTenantFromHost(_host: string): Tenant {
  return "primary";
}

export function isSecondaryHost(_host: string): boolean {
  return false;
}

export function isSecondaryClient(): boolean {
  return false;
}