// packages/functions/src/testFunction.ts
import { inngest } from "./inngest/client";

export const testFunction = inngest.createFunction(
  { id: "test-function" },             // 👈 unique name
  { event: "app/test.event" },         // 👈 event name
  async ({ event, step }) => {
    console.log("✅ Test event received:", event.data.message);
    return { echo: event.data.message };
  }
);
