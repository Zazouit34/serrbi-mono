import { serve } from "inngest/next";
import { inngest } from "@/functions/inngest/client";
import { sendEmail } from "@/functions/inngest/email-functions";
import { userRegistrationFlow } from "@/functions/inngest/auth-functions";
import { autoApplyOnJobCreated, autoApplyOnJobsImported } from "@/functions/inngest/auto-apply";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    sendEmail,
    userRegistrationFlow,
    autoApplyOnJobCreated,
    autoApplyOnJobsImported,
  ],
});