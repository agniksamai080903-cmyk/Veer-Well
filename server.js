const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));

function getGeminiModelUrl() {
  return `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`;
}

function extractTextFromGeminiResponse(payload) {
  if (!payload || !payload.candidates || !Array.isArray(payload.candidates)) {
    return '';
  }

  const candidate = payload.candidates[0];
  if (!candidate || !candidate.content || !Array.isArray(candidate.content.parts)) {
    return '';
  }

  return candidate.content.parts
    .map((part) => (typeof part.text === 'string' ? part.text : ''))
    .join('\n')
    .trim();
}

function parseJsonLikeText(rawText) {
  if (!rawText) return null;

  const cleaned = rawText
    .replace(/```json\s*/gi, '')
    .replace(/```/g, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch (secondError) {
      return null;
    }
  }
}

function buildRakshakPrompt(message, context = {}) {
  const contextSummary = JSON.stringify(context, null, 2);

  return `You are Rakshak, a calm and highly capable AI wellness assistant designed specifically for CAPF personnel and frontline duty staff. Your task is to help users manage stress, emotional strain, fatigue, sleep disruption, moral pressure, and operational workload without judgment.

Core behavior:
- Be grounded, calm, empathetic, and practical.
- Prioritize safety and emotional regulation.
- Keep responses brief but useful.
- Avoid diagnosing medical conditions definitively.
- If there is high distress, signs of self-harm, suicidal ideation, or acute crisis, encourage immediate support from a mental health professional, family member, unit mentor, or emergency services.
- For CAPF personnel, incorporate duty realities such as operational stress, disrupted sleep, family separation, high accountability, trauma exposure, and team pressure.

User message:
${message}

Context:
${contextSummary}

Return a helpful response in plain English. If the user is stressed, give a calm, actionable plan with brief steps, and if relevant, include grounding exercises, sleep support, breathing regulation, or a simple debrief routine. Keep the tone professional, supportive, and reassuring.`;
}

async function callGemini(prompt) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is missing. Add it to your .env file.');
  }

  const response = await fetch(getGeminiModelUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.4,
        topP: 0.9,
        maxOutputTokens: 700
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API request failed: ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  const text = extractTextFromGeminiResponse(payload);

  if (!text) {
    throw new Error('Gemini response was empty.');
  }

  return text;
}

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Rakshak',
    message: 'Rakshak is running and ready for CAPF stress support.'
  });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, context = {} } = req.body || {};

    if (!message || !String(message).trim()) {
      return res.status(400).json({
        success: false,
        error: 'A message is required.'
      });
    }

    const prompt = buildRakshakPrompt(String(message), context);
    const reply = await callGemini(prompt);

    res.json({
      success: true,
      reply,
      model: 'gemini-3.6-flash',
      name: 'Rakshak'
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Something went wrong while generating a response.'
    });
  }
});

app.post('/api/stress-check', async (req, res) => {
  try {
    const intake = req.body || {};
    const prompt = `
      You are Rakshak, an AI wellness assistant for CAPF personnel.

      Assess the user's stress state based on the following data:
      ${JSON.stringify(intake, null, 2)}

      Return only valid JSON with this exact structure:
      {
        "overallRisk": "low|moderate|high",
        "stressScore": 0,
        "keyTriggers": ["..."],
        "copingPlan": ["..."],
        "recommendedAction": "...",
        "followUp": "..."
      }

      Make it practical, brief, and fit a role-specific frontline environment.
      Avoid giving medical diagnosis. Focus on regulation, rest, debrief, support, and duty-safe coping.
    `;

    const rawResponse = await callGemini(prompt);
    const parsed = parseJsonLikeText(rawResponse);

    if (!parsed) {
      return res.json({
        success: true,
        assessment: {
          overallRisk: 'moderate',
          stressScore: 55,
          keyTriggers: ['High workload', 'Sleep disruption'],
          copingPlan: ['Take a 2-minute breathing reset', 'Reduce sensory load', 'Prioritize sleep and hydration'],
          recommendedAction: 'Take a short break and debrief before resuming duty.',
          followUp: 'Continue monitoring and reconnect if stress increases.'
        },
        note: 'Rakshak generated a fallback response because the model output could not be parsed.'
      });
    }

    res.json({
      success: true,
      assessment: parsed
    });
  } catch (error) {
    console.error('Stress check error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Stress assessment failed.'
    });
  }
});

app.get('/', (req, res) => {
  res.json({
    app: 'Rakshak',
    purpose: 'AI stress regulation and emotional resilience support for CAPF personnel.',
    endpoints: {
      health: '/api/health',
      chat: '/api/chat',
      stressCheck: '/api/stress-check'
    }
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error.'
  });
});

function startServer(customPort = PORT) {
  const targetPort = Number(customPort) || PORT;
  return app.listen(targetPort, () => {
    console.log(`Rakshak AI is running on http://localhost:${targetPort}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
