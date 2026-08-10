export type ModelId =
  | "claude-opus-4-6"
  | "claude-sonnet-4-6"
  | "claude-haiku-4-5";

export type ModelInfo = {
  id: ModelId;
  name: string;
  description: string;
  badge?: string;
};

export const MODELS: ModelInfo[] = [
  {
    id: "claude-opus-4-6",
    name: "Claude Opus 4.6",
    description: "Highest capability for complex reasoning and coding.",
    badge: "Powerful"
  },
  {
    id: "claude-sonnet-4-6",
    name: "Claude Sonnet 4.6",
    description: "Fast, balanced model for everyday work.",
    badge: "Balanced"
  },
  {
    id: "claude-haiku-4-5",
    name: "Claude Haiku 4.5",
    description: "Fast and efficient for lightweight tasks.",
    badge: "Fast"
  }
];

export function getModel(id: string) {
  return MODELS.find((m) => m.id === id) ?? MODELS[1];
}