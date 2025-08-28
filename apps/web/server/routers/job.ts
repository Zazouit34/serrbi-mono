import { protectedProcedure, router } from "../trpc";
import { jobListingFormSchema } from "@workspace/ui/lib/validation-schemas";
import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@workspace/db";

export const jobRouter = router({
  createJob: protectedProcedure
    .input(jobListingFormSchema)
    .mutation(async ({ ctx, input }) => {
      const db = ctx.prisma as PrismaClient;
      const user = (ctx as any).user;

      try {
        const job = await db.job.create({
          data: {
            userId: user.id,
            title: input.title,
            description: input.description,
            category: input.category,
            locationRequirement: input.locationRequirement,
            experienceLevel: input.experienceLevel,
            type: input.type,
            wage: input.wage || null,
            stateAbbreviation: input.stateAbbreviation || null,
            city: input.city || null,
            applicationEmail: input.applicationEmail || "",
            applicationUrl: input.applicationUrl || null,
            status: "draft", // Default status
          },
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            locationRequirement: true,
            experienceLevel: true,
            type: true,
            wage: true,
            stateAbbreviation: true,
            city: true,
            applicationEmail: true,
            applicationUrl: true,
            status: true,
            createdAt: true,
          },
        });

        return { 
          success: true, 
          message: "Job listing created successfully", 
          job 
        };
      } catch (error) {
        console.error("Error creating job:", error);
        throw new TRPCError({ 
          code: "INTERNAL_SERVER_ERROR", 
          message: "Failed to create job listing" 
        });
      }
    }),
});