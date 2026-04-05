import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  databaseUrl: process.env.DATABASE_URL || "",
  jwt: {
    secret: process.env.JWT_SECRET || "dev-jwt-secret-change-me",
    refreshSecret:
      process.env.JWT_REFRESH_SECRET || "dev-jwt-refresh-secret-change-me",
    expiresIn: "1h",
    refreshExpiresIn: "7d",
  },
  ai: {
    openaiApiKey: process.env.OPENAI_API_KEY || "",
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
    deepgramApiKey: process.env.DEEPGRAM_API_KEY || "",
    defaultTranscriptionProvider:
      process.env.DEFAULT_TRANSCRIPTION_PROVIDER || "deepgram",
    defaultReasoningProvider:
      process.env.DEFAULT_REASONING_PROVIDER || "openai",
    whisperConfidenceThreshold: parseFloat(
      process.env.WHISPER_CONFIDENCE_THRESHOLD || "0.8"
    ),
  },
  apple: {
    bundleId: process.env.APPLE_BUNDLE_ID || "com.angelai.app",
  },
} as const;
