
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server";
import { createContext } from "@/server/trpc";

export const dynamic = 'force-dynamic';

const handler = (req: Request) => fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext,
    onError: ({ error, path, input, type }) => {
        // Log zod validation issues and a small input preview for debugging
        const issues = (error as any)?.cause?.issues ?? undefined;
        let inputSample: unknown = input;
        try {
            if (Array.isArray(input)) inputSample = input.slice(0, 1);
        } catch {}
        console.error("tRPC error", {
            path,
            type,
            code: (error as any)?.code,
            message: error.message,
            issues,
            inputSample,
        });
    },
});

export { handler as GET, handler as POST };