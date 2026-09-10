export type LivestreamFlow = "idle" | "start" | "change";

export type LivestreamPrimaryAction = "start" | "update" | "turn-off" | "none";

export function livestreamPrimaryAction(input: {
  isLive: boolean;
  flow: LivestreamFlow;
}): LivestreamPrimaryAction {
  if (input.flow === "start") return "start";
  if (input.flow === "change") return "update";
  if (input.isLive) return "turn-off";
  return "none";
}

export function livestreamConfirmLabel(action: LivestreamPrimaryAction): string | null {
  if (action === "start") return "Start a Facebook livestream";
  if (action === "update") return "Update the live video";
  if (action === "turn-off") return "Turn off the livestream";
  return null;
}
