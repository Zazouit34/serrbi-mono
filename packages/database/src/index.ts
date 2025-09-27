export { prisma } from "./client";

// Re-export Prisma enums and types as runtime values (not type-only)
export { Prisma, SubscriptionPlan, SubscriptionStatus, PaymentStatus, Role } from "../generated/prisma";