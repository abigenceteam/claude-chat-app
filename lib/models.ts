export type ModelId =
  | "openrouter/free"
  | "anthropic/claude-sonnet-4.6"
  | "google/gemini-2.5-flash";

export type ModelInfo = {
  id: ModelId;
  name: string;
  description: string;
  badge?: string;
};

export const MODELS: ModelInfo[] = [
  {
    id: "openrouter/free",
    name: "Free Model",
    description: "Automatically selects an available free model.",
    badge: "Free"
  },
  {
    id: "anthropic/claude-sonnet-4.6",
    name: "Claude Sonnet 4.6",
    description: "Fast, balanced model for everyday work.",
    badge: "Claude"
  },
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    description: "Fast and capable model for everyday tasks.",
    badge: "Fast"
  }
];

export function getModel(id: string): ModelInfo {
  return MODELS.find((m) => m.id === id) ?? MODELS[0];
}
