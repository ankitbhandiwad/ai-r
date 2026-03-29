import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ELEVENLABS_API_BASE = "https://api.elevenlabs.io"
const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"
const DEFAULT_MODEL_ID = "eleven_multilingual_v2"
const DEFAULT_OUTPUT_FORMAT = "mp3_44100_128"
const DEFAULT_VOICE_SPEED = 1.2
const JSON_HEADERS = {
  "Cache-Control": "no-store"
}

function getConfiguredVoiceId() {
  return process.env.ELEVENLABS_VOICE_ID?.trim() || DEFAULT_VOICE_ID
}

function normalizeSpeechText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 420)
}

export async function POST(request) {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim()
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "ELEVENLABS_API_KEY is not configured."
      },
      {
        status: 500,
        headers: JSON_HEADERS
      }
    )
  }

  let payload
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json(
      {
        error: "Expected a JSON body."
      },
      {
        status: 400,
        headers: JSON_HEADERS
      }
    )
  }

  const text = normalizeSpeechText(payload?.text)
  if (!text) {
    return NextResponse.json(
      {
        error: "Speech text is required."
      },
      {
        status: 400,
        headers: JSON_HEADERS
      }
    )
  }

  const modelId = process.env.ELEVENLABS_MODEL_ID?.trim() || DEFAULT_MODEL_ID
  const voiceId = getConfiguredVoiceId()

  try {
    const response = await fetch(
      `${ELEVENLABS_API_BASE}/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${encodeURIComponent(DEFAULT_OUTPUT_FORMAT)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
          "xi-api-key": apiKey
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: {
            speed: DEFAULT_VOICE_SPEED
          }
        }),
        cache: "no-store"
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        {
          error: errorText || `ElevenLabs speech generation failed (${response.status})`
        },
        {
          status: response.status,
          headers: JSON_HEADERS
        }
      )
    }

    const audioBuffer = await response.arrayBuffer()
    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": response.headers.get("content-type") || "audio/mpeg"
      }
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to generate advisory speech."
      },
      {
        status: 502,
        headers: JSON_HEADERS
      }
    )
  }
}
