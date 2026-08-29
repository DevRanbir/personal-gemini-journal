"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { getSlashPresetInstructions, parseSlashPresets, type SlashPresetId } from '@/lib/chat-presets';

import { showHarmonyToast } from '@/components/progress-toast';

export interface UserSettings {
  writingStyle: 'concise' | 'formal' | 'technical' | 'creative' | 'tabular' | 'graphs' | 'algorithm' | 'map-searches' | 'joking' | 'auto';
  language: 'hinglish' | 'english' | 'punjabi' | 'marathi' | 'hindi';
  maxLength: number;
}

interface SettingsContextType {
  settings: UserSettings;
  updateWritingStyle: (style: UserSettings['writingStyle']) => void;
  updateLanguage: (language: UserSettings['language']) => void;
  updateMaxLength: (length: number) => void;
  getSystemPrompt: () => string;
  getSystemPromptForMessage: (message: string, language?: UserSettings['language']) => Promise<string>;
  temporarySwitchMode: (targetMode: UserSettings['writingStyle'], message: string) => void;
  revertToAuto: () => void;
}

const defaultSettings: UserSettings = {
  writingStyle: 'auto',
  language: 'hinglish',
  maxLength: 2048 // Retained for older saved settings; prompt length is automatic.
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [wasAutoMode, setWasAutoMode] = useState(false);
  const [currentActiveMode, setCurrentActiveMode] = useState<UserSettings['writingStyle']>('auto');

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('harmony-settings');
    if (saved) {
      try {
        const parsedSettings = JSON.parse(saved);
        const newSettings = { ...defaultSettings, ...parsedSettings, writingStyle: 'auto' as const };
        setSettings(newSettings);
        setCurrentActiveMode(newSettings.writingStyle);
      } catch (error) {
        console.error('Error loading settings:', error);
        setCurrentActiveMode(defaultSettings.writingStyle);
      }
    } else {
      setCurrentActiveMode(defaultSettings.writingStyle);
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('harmony-settings', JSON.stringify(settings));
  }, [settings]);

  const updateWritingStyle = useMemo(() => (writingStyle: UserSettings['writingStyle']) => {
    setSettings(prev => ({ ...prev, writingStyle }));
    if (!wasAutoMode) {
      setCurrentActiveMode(writingStyle);
    }
    showHarmonyToast({
      title: "Writing Style Updated",
      description: `AI response mode set to ${writingStyle}`,
      iconType: "sparkles",
    });
  }, [wasAutoMode]);

  const updateLanguage = useMemo(() => (language: UserSettings['language']) => {
    setSettings(prev => ({ ...prev, language }));
    showHarmonyToast({
      title: "Language Preference Updated",
      description: `Harmony output language set to ${language}`,
      iconType: "sparkles",
    });
  }, []);

  const updateMaxLength = useMemo(() => (maxLength: number) => {
    setSettings(prev => ({ ...prev, maxLength }));
  }, []);

  // Function to detect and temporarily switch mode based on user query
  const temporarySwitchMode = useMemo(() => (_targetMode: UserSettings['writingStyle'], _message: string) => {
    // Style detection is message-scoped in getSystemPromptForMessage.
  }, []);

  // Function to revert back to auto mode
  const revertToAuto = useMemo(() => () => {
    // Retained for compatibility; style state is no longer temporarily changed.
  }, []);

  const getSystemPrompt = useMemo(() => () => {
    const styleMap = {
      concise: "Ultra-brief. 1-2 sentences max.",
      formal: "Professional, minimal. Key points only.", 
      technical: "Technical facts only. No verbose explanations.",
      creative: "Creative but short.",
      tabular: "Simple tables only.",
      graphs: "MANDATORY: Include chart-ready JSON data in a fenced json code block. NEVER say you can't create charts. Example: ```json\n{\"type\": \"pie\", \"data\": [{\"name\": \"Rent\", \"value\": 40}, {\"name\": \"Food\", \"value\": 25}], \"xKey\": \"name\", \"yKey\": \"value\"}\n``` Required types: line, bar, pie, area, scatter. Also answer the user normally when other slash commands are present.",
      algorithm: "ALGORITHM MODE: Step format with line breaks:\nstep 1: start\nstep 2: input\nstep 3: repeat step 4, 5 (condition)\nstep 4: action\n    sub-action (4 spaces)\nstep 5: exit\n\nCode with breaks:\n```python\ndef func():\n    action()\n    return result\n```",
      'map-searches': "Location info only.",
      joking: "Brief humor only.",
      auto: "AUTO: Adapt silently based on query. Never announce mode:\n- Charts → JSON charts\n- Algorithm → step format + code\n- Tables → clean tables\n- Location → location info only\n- Technical → tech facts\n- Business → professional\n- Creative → creative\n- Casual → concise\n- Humor → joking\nSwitch naturally, no announcements."
    };

    const langMap = {
      hinglish: "Hinglish mix",
      english: "English",
      punjabi: "Punjabi",
      marathi: "Marathi",
      hindi: "Hindi"
    };

    const effectiveMode = settings.writingStyle;

    const ACTION_SCHEMA = `
ALWAYS respond with ONLY a valid JSON object — no markdown fences, no extra text outside the JSON. Use this exact schema:
{
  "reply": "<your human-readable response in ${langMap[settings.language]}>",
  "userdata": ["<permanent personal fact about the user, if shared>"],
  "action": {
    "todos": [{ "title": "<task title>", "dueDate": "<YYYY-MM-DD>" }],
    "events": [{ "title": "<event title>", "start": "<YYYY-MM-DDThh:mm:ss>", "end": "<YYYY-MM-DDThh:mm:ss>", "description": "<optional>" }],
    "dataLog": { "addPoints": ["<1-line summary of what user talked about or did today>"] }
  }
}

RULES:
- "reply" is ALWAYS required. Write a natural conversational response here.
- "action.dataLog.addPoints" is ALWAYS required — always add exactly 1 entry summarizing what the user talked about, asked, or shared in this message. Keep it short (max 10 words). Examples: "Asked about Python loops", "Mentioned car service at 2 PM", "Shared that he scored 9/10 in maths".
- Only include "todos" when the user wants to create/save a task.
- Only include "events" when the user wants to schedule a calendar event or appointment.
- Only include "userdata" when the user shared a personal fact worth remembering long-term (birthday, score, milestone).
- Infer dates: "aaj"/"today" = today, "kal"/"tomorrow" = tomorrow, "2 bje"/"2 baje"/"2 PM" = 14:00.
- Respond in ${langMap[settings.language]}.`;

    return `Harmony by Ranbir — a smart personal journal AI. ${styleMap[effectiveMode]} ${ACTION_SCHEMA}`;
  }, [settings, wasAutoMode]);

  // Function to get system prompt for a specific message (handles auto detection immediately)
  const getSystemPromptForMessage = useMemo(() => async (message: string, language?: UserSettings['language']): Promise<string> => {
    const styleMap = {
      concise: "Ultra-brief. 1-2 sentences max.",
      formal: "Professional, minimal. Key points only.", 
      technical: "Technical facts only. No verbose explanations.",
      creative: "Creative but short.",
      tabular: "Simple tables only.",
      graphs: "MANDATORY: Include chart-ready JSON data in a fenced json code block. NEVER say you can't create charts. Example: ```json\n{\"type\": \"pie\", \"data\": [{\"name\": \"Rent\", \"value\": 40}, {\"name\": \"Food\", \"value\": 25}], \"xKey\": \"name\", \"yKey\": \"value\"}\n``` Required types: line, bar, pie, area, scatter. Also answer the user normally when other slash commands are present.",
      algorithm: "ALGORITHM MODE: Step format with line breaks:\nstep 1: start\nstep 2: input\nstep 3: repeat step 4, 5 (condition)\nstep 4: action\n    sub-action (4 spaces)\nstep 5: exit\n\nCode with breaks:\n```python\ndef func():\n    action()\n    return result\n```",
      'map-searches': "Location info only.",
      joking: "Brief humor only.",
      auto: "This should never be used - auto mode should be resolved before reaching here."
    };

    const langMap = {
      hinglish: "Hinglish mix",
      english: "English",
      punjabi: "Punjabi",
      marathi: "Marathi",
      hindi: "Hindi"
    };

    const parsedMessage = parseSlashPresets(message);
    const cleanMessage = parsedMessage.cleanContent || message;
    const explicitStyles = parsedMessage.presets.filter(
      (preset): preset is Exclude<SlashPresetId, 'compare' | 'auto' | 'gsearch' | 'wikisearch'> =>
        preset !== 'compare' && preset !== 'auto' && preset !== 'gsearch' && preset !== 'wikisearch' && preset in styleMap
    );
    const explicitStyle = explicitStyles[0];
    const hasExplicitStyle = Boolean(explicitStyle);
    const cleanMessageRequestsComparison = /\b(compare|comparison|versus|vs\.?)\b/i.test(cleanMessage);
    const shouldForceComparisonTable =
      parsedMessage.presets.includes('tabular') &&
      (parsedMessage.presets.includes('compare') || cleanMessageRequestsComparison);
    const slashInstructions = getSlashPresetInstructions(
      parsedMessage.presets.filter((preset) => preset !== 'auto' || !hasExplicitStyle)
    );
    let effectiveMode: UserSettings['writingStyle'] = explicitStyle ?? 'auto';

    // Instant local classification rules for common patterns (prevents incorrect classifier fallbacks)
    const isChartRequest = /\b(chart|graph|plot|visualize|draw a chart|draw chart|banao chart|chart banao|chart bana|show chart|pie chart|bar chart|line chart)\b/i.test(cleanMessage);
    const isAlgorithmRequest = /\b(code|algorithm|step by step|steps|function|python|javascript|typescript|java|c\+\+|cpp|coding)\b/i.test(cleanMessage);
    const isTableRequest = /\b(table|tabular|matrix|grid)\b/i.test(cleanMessage);

    if (isChartRequest) {
      effectiveMode = 'graphs';
    } else if (isAlgorithmRequest) {
      effectiveMode = 'algorithm';
    } else if (isTableRequest) {
      effectiveMode = 'tabular';
    } else if (!hasExplicitStyle) {
      
      try {
        const response = await fetch('/api/chat/groq', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `Analyze this user query and respond with ONLY the most appropriate writing style from these options:

AVAILABLE STYLES:
- concise: Ultra-brief responses (1-2 sentences)
- formal: Professional, minimal responses  
- technical: Technical facts only
- creative: Creative but short responses
- tabular: Simple tables only
- graphs: Create JSON charts for data visualization
- algorithm: Step-by-step algorithms with code
- map-searches: Location info only
- joking: Brief humor only

USER QUERY: "${cleanMessage}"

Respond with ONLY one word - the style name. No explanation, no other text.`,
            chatId: 'style-detection',
            userId: 'system',
            systemPrompt: 'You are a writing style classifier. Respond with ONLY the style name that best matches the user query. No explanations.'
          })
        });

        if (response.ok) {
          const data = await response.json();
          const detectedStyle = data.response?.trim().toLowerCase();
          
          // Validate the detected style
          const validStyles: UserSettings['writingStyle'][] = ['concise', 'formal', 'technical', 'creative', 'tabular', 'graphs', 'algorithm', 'map-searches', 'joking'];
          
          if (validStyles.includes(detectedStyle as UserSettings['writingStyle'])) {
            effectiveMode = detectedStyle as UserSettings['writingStyle'];
          } else {
            console.warn('Invalid style detected:', detectedStyle, 'falling back to concise');
            effectiveMode = 'concise';
          }
        } else {
          console.error('Failed to detect style, falling back to concise');
          effectiveMode = 'concise';
        }
      } catch (error) {
        console.error('Error detecting style:', error, 'falling back to concise');
        effectiveMode = 'concise';
      }
    }

    const responseLanguage = language ?? settings.language;

    const ACTION_SCHEMA = `
ALWAYS respond with ONLY a valid JSON object — no markdown fences, no extra text outside the JSON. Use this exact schema:
{
  "reply": "<your human-readable response>",
  "userdata": ["<permanent personal fact about the user, if shared>"],
  "action": {
    "todos": [{ "title": "<task title>", "dueDate": "<YYYY-MM-DD>" }],
    "events": [{ "title": "<event title>", "start": "<YYYY-MM-DDThh:mm:ss>", "end": "<YYYY-MM-DDThh:mm:ss>", "description": "<optional>" }],
    "dataLog": { "addPoints": ["<1-line summary of what user talked about or did today>"] }
  }
}

RULES:
- "reply" is ALWAYS required. Write a natural conversational response here.
- "action.dataLog.addPoints" is ALWAYS required — always add exactly 1 short entry (max 10 words) summarizing what the user talked about, asked, or shared. Examples: "Asked about Python loops", "Mentioned car service at 2 PM", "Scheduled car service task for today", "Chatted about general knowledge".
- Only include "todos" when the user wants to create/save a task or to-do.
- Only include "events" when the user wants to schedule a calendar event, appointment, or meeting.
- Only include "userdata" when the user shared a personal fact worth remembering long-term (birthday, score, milestone, preference).
- Infer dates: "aaj"/"today" = today, "kal"/"tomorrow" = tomorrow, "2 bje"/"2 baje"/"2 PM" = 14:00.
- Respond in ${langMap[responseLanguage]}.`;

    const combinedPresetInstruction = parsedMessage.hasExplicitPresets
      ? "Honor every slash command together; do not let one preset cancel another."
      : "";
    const comparisonInstruction = shouldForceComparisonTable
      ? "Because this is a comparison table request, include a concise comparison table in the reply field."
      : "";
    const graphAndTableInstruction =
      parsedMessage.presets.includes('tabular') && parsedMessage.presets.includes('graphs')
        ? "Include both sections: a markdown comparison table and chart-ready JSON graph data in the reply field."
        : "";

    return `Harmony by Ranbir — a smart personal journal AI. ${styleMap[effectiveMode]} ${combinedPresetInstruction} ${slashInstructions} ${comparisonInstruction} ${graphAndTableInstruction} ${ACTION_SCHEMA}`;
  }, [settings]);

  const contextValue = useMemo(() => ({
    settings,
    updateWritingStyle,
    updateLanguage,
    updateMaxLength,
    getSystemPrompt,
    getSystemPromptForMessage,
    temporarySwitchMode,
    revertToAuto
  }), [settings, updateWritingStyle, updateLanguage, updateMaxLength, getSystemPrompt, getSystemPromptForMessage, temporarySwitchMode, revertToAuto]);

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
}
