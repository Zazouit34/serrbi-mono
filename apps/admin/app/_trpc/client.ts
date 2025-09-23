import { createTRPCReact } from "@trpc/react-query";

// Cast to any so .useUtils(), nested routers (auth, task, service) are available
export const trpc = createTRPCReact<any>() as any;


