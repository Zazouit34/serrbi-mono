import { buildMainAgentPrompt } from "./main";
import { buildRelatedPromptsPrompt } from "./related";

type PromptContext = {
  locale?: string;
  scope?: "auto" | "jobs" | "services" | "tasks";
};

export function buildAgentSystemPrompt(context?: PromptContext): string {
  return [buildMainAgentPrompt(context), buildRelatedPromptsPrompt(context)].join("\n\n");
}
