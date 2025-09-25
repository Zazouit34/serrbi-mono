import { router } from "./trpc";
import { authRouter } from "./routers/auth";
import { jobRouter } from "./routers/job";
import { serviceRouter } from "./routers/service";
import { taskRouter } from "./routers/task";
import { favoriteRouter } from "./routers/favorite";
import { subscriptionRouter } from "./routers/subscription";

export const appRouter = router({
  auth: authRouter,
  job: jobRouter,
  service: serviceRouter,
  task: taskRouter,
  favorite: favoriteRouter,
  subscription: subscriptionRouter,
});
export type AppRouter = typeof appRouter;