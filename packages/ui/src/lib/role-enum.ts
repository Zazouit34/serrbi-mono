export const roleValues = [
  "USER",
  "ADMIN",
  "COMPANY",
] as const

export type RoleValue = (typeof roleValues)[number]


