import { inngest } from "@/functions/inngest/client";
import { testFunction } from "@/functions/test-function";
import { serve } from "inngest/next";

export const { GET, POST } = serve({
  client: inngest,
  functions: [testFunction],
});