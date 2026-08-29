export type SlashPresetId =
  | "concise"
  | "formal"
  | "technical"
  | "creative"
  | "tabular"
  | "graphs"
  | "algorithm"
  | "map-searches"
  | "joking"
  | "auto"
  | "compare"
  | "gsearch"
  | "wikisearch";

type SlashPreset = {
  id: SlashPresetId;
  label: string;
  aliases: string[];
  instruction: string;
};

export const SLASH_PRESETS: SlashPreset[] = [
  {
    id: "concise",
    label: "Concise",
    aliases: ["concise", "short", "brief"],
    instruction: "Keep the answer concise and focused.",
  },
  {
    id: "formal",
    label: "Formal",
    aliases: ["formal", "professional", "business"],
    instruction: "Use a professional, formal tone.",
  },
  {
    id: "technical",
    label: "Technical",
    aliases: ["technical", "tech", "docs"],
    instruction: "Use technical wording and prioritize precise implementation details.",
  },
  {
    id: "creative",
    label: "Creative",
    aliases: ["creative", "story", "write"],
    instruction: "Use a creative style while staying useful and direct.",
  },
  {
    id: "tabular",
    label: "Table",
    aliases: ["table", "tabular", "grid"],
    instruction: "Include a clean markdown table when it helps the answer.",
  },
  {
    id: "compare",
    label: "Compare",
    aliases: ["compare", "comparison", "vs"],
    instruction: "Compare the options directly, highlighting differences and tradeoffs.",
  },
  {
    id: "gsearch",
    label: "Google Search",
    aliases: ["gsearch", "google", "websearch", "web"],
    instruction: "Use web search evidence before answering.",
  },
  {
    id: "wikisearch",
    label: "Wiki Search",
    aliases: ["wikisearch", "wiki", "wikipedia"],
    instruction: "Use Wikipedia evidence before answering.",
  },
  {
    id: "graphs",
    label: "Graphs",
    aliases: ["graph", "graphs", "chart", "charts", "plot"],
    instruction:
      'Include chart-ready JSON in a code block when the answer includes data. Supported chart types: line, bar, pie, area, scatter. When combined with /table or comparison requests, include the table plus the chart data.',
  },
  {
    id: "algorithm",
    label: "Algorithm",
    aliases: ["algorithm", "algo", "steps", "step"],
    instruction: "Use step-by-step algorithm formatting and include code only when useful.",
  },
  {
    id: "map-searches",
    label: "Map",
    aliases: ["map", "maps", "location", "directions", "route"],
    instruction: "Focus on location, directions, or map-related details.",
  },
  {
    id: "joking",
    label: "Joking",
    aliases: ["joke", "joking", "funny", "humor"],
    instruction: "Use brief, light humor.",
  },
  {
    id: "auto",
    label: "Auto",
    aliases: ["auto"],
    instruction: "Adapt the response style to the user's request.",
  },
];

const presetByAlias = new Map<string, SlashPreset>(
  SLASH_PRESETS.flatMap((preset) =>
    preset.aliases.map((alias) => [alias.toLowerCase(), preset] as const),
  ),
);

export function getSlashPreset(id: SlashPresetId) {
  return SLASH_PRESETS.find((preset) => preset.id === id);
}

export function parseSlashPresets(input: string) {
  const presets: SlashPresetId[] = [];
  const unknownCommands: string[] = [];

  const cleanContent = input
    .replace(/(^|\s)\/([a-z][\w-]*)\b/gi, (match, prefix: string, command: string) => {
      const preset = presetByAlias.get(command.toLowerCase());

      if (!preset) {
        unknownCommands.push(command);
        return match;
      }

      if (!presets.includes(preset.id)) {
        presets.push(preset.id);
      }

      return prefix;
    })
    .replace(/\s{2,}/g, " ")
    .trim();

  return {
    cleanContent,
    presets,
    unknownCommands,
    hasExplicitPresets: presets.length > 0,
  };
}

export function getSlashPresetInstructions(presets: SlashPresetId[]) {
  return presets
    .map((id) => getSlashPreset(id)?.instruction)
    .filter((instruction): instruction is string => Boolean(instruction))
    .join(" ");
}

export function getSlashPresetLabels(presets: SlashPresetId[]) {
  return presets
    .map((id) => getSlashPreset(id)?.label)
    .filter((label): label is string => Boolean(label));
}
