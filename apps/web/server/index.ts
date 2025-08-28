import { router } from "./trpc";
import { authRouter } from "./routers/auth";
import { jobRouter } from "./routers/job";

export const appRouter = router({
  auth: authRouter,
  job: jobRouter,
});
export type AppRouter = typeof appRouter;