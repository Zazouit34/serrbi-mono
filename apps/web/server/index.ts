import { router } from "./trpc";
import { authRouter } from "./routers/auth";
import { jobRouter } from "./routers/job";
import { serviceRouter } from "./routers/service";
import { taskRouter } from "./routers/task";
import { inngestRouter } from "./routers/inngest";


export const appRouter = router({
  auth: authRouter,
  job: jobRouter,
  service: serviceRouter,
  task: taskRouter,
  inngest: inngestRouter,
 
});
export type AppRouter = typeof appRouter;