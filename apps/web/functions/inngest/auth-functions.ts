import { inngest } from "./client";

export const userRegistrationFlow = inngest.createFunction(
  { id: "user-registration-flow" },
  { event: "auth/user.registered" },
  async ({ event, step }) => {
    const { user } = event.data;
    
    // Send welcome email immediately
    await step.run("send-welcome-email", async () => {
      await inngest.send({
        name: "email/send",
        data: {
          type: "welcome",
          data: { email: user.email, name: user.name }
        }
      });
    });
    
    // Setup user defaults after 5 minutes (when they've had time to explore)
    await step.sleep("wait-for-user-exploration", "5m");
    
    await step.run("setup-user-preferences", async () => {
      // Create default job alerts, saved searches, etc.
      // This happens in background without blocking registration
    });
    
    return { success: true };
  }
);