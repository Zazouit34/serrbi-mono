import { inngest } from "./client";
import { 
  sendPasswordResetEmail, 
  sendJobApplicationEmail,
  sendWelcomeEmail  // Add this import
} from "@/server/services/email";

// Email sending function
export const sendEmail = inngest.createFunction(
  { id: "send-email" },
  { event: "email/send" },
  async ({ event, step }) => {
    const { type, data } = event.data;
    
    await step.run("send-email", async () => {
      switch (type) {
        case "password-reset":
          await sendPasswordResetEmail(data.email, data.token);
          break;
        case "job-application":
          await sendJobApplicationEmail(
            data.applicationEmail,
            data.jobTitle,
            data.companyName,
            data.applicantName,
            data.applicantEmail,
            data.cvData,
            data.cvFilename
          );
          break;
        case "welcome":  // Add this case
          await sendWelcomeEmail(data.email, data.name);
          break;
        default:
          throw new Error(`Unknown email type: ${type}`);
      }
    });
    
    return { success: true };
  }
);
