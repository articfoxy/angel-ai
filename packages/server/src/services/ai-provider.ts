import { config } from "../config/index.js";

export interface TranscriptSegment {
  speaker: string;
  text: string;
  timestamp: number;
}

export interface TranscribeOptions {
  language?: string;
  format?: string;
}

export interface ExtractionSchema {
  type: string;
  fields: string[];
}

export interface WhisperCardSuggestion {
  type: "question" | "reminder" | "context" | "follow_up";
  content: string;
  confidence: number;
}

export interface AIProvider {
  transcribe(
    audio: Buffer,
    options?: TranscribeOptions
  ): Promise<TranscriptSegment[]>;
  extract(transcript: string, schema: ExtractionSchema): Promise<any>;
  generate(prompt: string, context?: string): Promise<string>;
  suggest(
    transcript: string,
    memories: Array<{ name: string; content: any }>
  ): Promise<WhisperCardSuggestion[]>;
}

class MockProvider implements AIProvider {
  async transcribe(
    _audio: Buffer,
    _options?: TranscribeOptions
  ): Promise<TranscriptSegment[]> {
    return [
      {
        speaker: "Speaker 1",
        text: "This is a mock transcription segment.",
        timestamp: Date.now(),
      },
      {
        speaker: "Speaker 2",
        text: "And this is the response in the conversation.",
        timestamp: Date.now() + 2000,
      },
    ];
  }

  async extract(transcript: string, schema: ExtractionSchema): Promise<any> {
    const result: Record<string, any> = {};
    if (schema.fields.includes("participants")) {
      result.participants = [
        { name: "Speaker 1", role: "host", notes: "Led the discussion" },
        { name: "Speaker 2", role: "participant", notes: "Provided input" },
      ];
    }
    if (schema.fields.includes("keyFacts")) {
      result.keyFacts = [
        "Discussed project timeline",
        "Agreed on next steps",
      ];
    }
    if (schema.fields.includes("actionItems")) {
      result.actionItems = [
        { task: "Follow up on proposal", assignee: "Speaker 1", due: null },
      ];
    }
    if (schema.fields.includes("promises")) {
      result.promises = ["Will send the updated document by Friday"];
    }
    if (schema.fields.includes("risks")) {
      result.risks = ["Timeline might slip if dependencies are delayed"];
    }
    if (schema.fields.includes("summary")) {
      result.summary = {
        brief: "Meeting to discuss project progress and next steps.",
        detailed:
          "The team met to review current project status. Key decisions were made about the timeline and resource allocation.",
      };
    }
    return result;
  }

  async generate(prompt: string, _context?: string): Promise<string> {
    if (prompt.toLowerCase().includes("email")) {
      return `Subject: Follow-up from our conversation\n\nHi,\n\nThank you for taking the time to meet today. Here are the key points we discussed:\n\n- Project timeline review\n- Resource allocation\n- Next steps\n\nPlease let me know if I missed anything.\n\nBest regards`;
    }
    if (prompt.toLowerCase().includes("memo")) {
      return `MEMO\n\nDate: ${new Date().toLocaleDateString()}\n\nSubject: Meeting Summary\n\nKey Discussion Points:\n1. Project status update\n2. Resource needs\n3. Timeline adjustments\n\nAction Items:\n- Review proposal by end of week\n- Schedule follow-up meeting`;
    }
    if (prompt.toLowerCase().includes("prd")) {
      return `# Product Requirements Document\n\n## Overview\nBased on the discussion, here are the product requirements.\n\n## Goals\n- Improve user experience\n- Increase engagement\n\n## Requirements\n1. Feature A: Description\n2. Feature B: Description\n\n## Timeline\nQ1 2026: Phase 1\nQ2 2026: Phase 2`;
    }
    return `Generated content based on the provided context and prompt. This is a mock response that would normally come from an AI model like GPT-4o or Claude.`;
  }

  async suggest(
    _transcript: string,
    _memories: Array<{ name: string; content: any }>
  ): Promise<WhisperCardSuggestion[]> {
    return [
      {
        type: "reminder",
        content: "You mentioned following up on this topic last week.",
        confidence: 0.85,
      },
      {
        type: "context",
        content:
          "This person previously expressed interest in the Q2 roadmap.",
        confidence: 0.9,
      },
    ];
  }
}

class OpenAIProvider implements AIProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async transcribe(
    audio: Buffer,
    _options?: TranscribeOptions
  ): Promise<TranscriptSegment[]> {
    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}` },
        body: (() => {
          const form = new FormData();
          form.append(
            "file",
            new Blob([audio], { type: "audio/webm" }),
            "audio.webm"
          );
          form.append("model", "whisper-1");
          form.append("response_format", "verbose_json");
          return form;
        })(),
      }
    );

    if (!response.ok) {
      throw new Error(`OpenAI transcription failed: ${response.statusText}`);
    }

    const data = (await response.json()) as any;
    return (data.segments || []).map((seg: any) => ({
      speaker: "Speaker 1",
      text: seg.text,
      timestamp: Math.round(seg.start * 1000),
    }));
  }

  async extract(transcript: string, schema: ExtractionSchema): Promise<any> {
    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `Extract the following from the transcript: ${schema.fields.join(", ")}. Return as JSON.`,
            },
            { role: "user", content: transcript },
          ],
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`OpenAI extraction failed: ${response.statusText}`);
    }

    const data = (await response.json()) as any;
    return JSON.parse(data.choices[0].message.content);
  }

  async generate(prompt: string, context?: string): Promise<string> {
    const messages: Array<{ role: string; content: string }> = [];
    if (context) {
      messages.push({ role: "system", content: context });
    }
    messages.push({ role: "user", content: prompt });

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: "gpt-4o", messages }),
      }
    );

    if (!response.ok) {
      throw new Error(`OpenAI generation failed: ${response.statusText}`);
    }

    const data = (await response.json()) as any;
    return data.choices[0].message.content;
  }

  async suggest(
    transcript: string,
    memories: Array<{ name: string; content: any }>
  ): Promise<WhisperCardSuggestion[]> {
    const memoryContext = memories
      .map((m) => `${m.name}: ${JSON.stringify(m.content)}`)
      .join("\n");

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are a whisper card engine. Given a transcript and memory context, suggest 0-2 brief, high-confidence nudges. Return JSON array with objects having: type (question|reminder|context|follow_up), content (string), confidence (0-1).`,
            },
            {
              role: "user",
              content: `Transcript:\n${transcript}\n\nMemory:\n${memoryContext}`,
            },
          ],
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`OpenAI suggestion failed: ${response.statusText}`);
    }

    const data = (await response.json()) as any;
    const parsed = JSON.parse(data.choices[0].message.content);
    return Array.isArray(parsed) ? parsed : parsed.suggestions || [];
  }
}

const mockProvider = new MockProvider();

export function getProvider(): AIProvider {
  if (config.ai.openaiApiKey) {
    return new OpenAIProvider(config.ai.openaiApiKey);
  }
  return mockProvider;
}
