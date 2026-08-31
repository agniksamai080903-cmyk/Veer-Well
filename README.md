# Rakshak

Rakshak is an autonomous AI wellness assistant designed to support CAPF personnel in managing stress, emotional fatigue, and operational pressure.

## Features

- Conversational support for stress and anxiety regulation
- Quick stress assessment endpoint for duty-related pressure
- Calm, duty-aware AI guidance for frontline conditions
- Ready to connect to any frontend application via REST APIs

## Setup

1. Install dependencies:
   npm install
2. Start the app:
   npm start
3. Or run in watch mode:
   npm run dev

## Environment

Copy `.env.example` to `.env` and update your Gemini API key if needed.

## API

### GET /api/health
Returns the app status.

### POST /api/chat
Example payload:

```json
{
  "message": "I am feeling very overwhelmed after a long duty cycle.",
  "context": {
    "dutyType": "field deployment",
    "sleepHours": 4,
    "supportSystem": "limited"
  }
}
```

### POST /api/stress-check
Example payload:

```json
{
  "sleepHours": 4,
  "primaryStressors": ["long duty hours", "family separation"],
  "mood": "irritable",
  "energy": "low",
  "support": "moderate"
}
```

## Frontend integration

Use the backend base URL `http://localhost:5000` from your frontend app. The frontend can call the above endpoints for conversation and stress analysis.

This backend uses the supported Gemini 3.6 Flash model so it remains compatible with the API key you supplied.

## Notes

This project is intentionally designed as a backend API service so it can be integrated with an existing frontend repo while keeping the AI logic centralised and reusable.
