import { protectedProcedure, router, publicProcedure } from "../trpc";
import { inngest } from "@/functions/inngest/client";


export const inngestRouter = router({
    sendTestEvent: protectedProcedure.mutation(async ({ ctx }) => {
        await inngest.send({
            name: "app/test.event",
            data: { message: "Hello, from Trpc!" },
        })
        return {ok : true, message: "Event sent"};
    }),
});