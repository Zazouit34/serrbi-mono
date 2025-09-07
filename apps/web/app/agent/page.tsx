"use client"

import { trpc } from "@/app/_trpc/client"
import { Button } from "@workspace/ui/components/button"
import AIChatbot  from "@/components/ui/form/ai/ai-chatbot"

export default function AgentPage() {

  const testEvent = trpc.inngest.sendTestEvent.useMutation();

  return (
   <div>
        <h1 className="mb-8 text-4xl font-bold text-foreground">
          AI Agent Platform
        </h1>
        <div className="grid gap-6">
          <div className="p-6 rounded-lg border bg-card">
            <h2 className="mb-4 text-2xl font-semibold">Smart Solutions</h2>
            <p className="text-muted-foreground">
              Leverage AI agents to streamline your workflow by allowing users to create, edit, and delete jobs.
            </p>
            <Button onClick={() => testEvent.mutate()}>Send Test Event</Button>
          </div>
          <AIChatbot />
        </div>
  </div> 
  )
} 