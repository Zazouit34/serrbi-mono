import { serve } from "inngest/next";
import { inngest } from "@/functions/inngest/client";
import { sendEmail } from "@/functions/inngest/email-functions";
import { userRegistrationFlow } from "@/functions/inngest/auth-functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    sendEmail,
    userRegistrationFlow,
  ],
});