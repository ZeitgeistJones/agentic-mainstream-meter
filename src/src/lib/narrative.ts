import type { LaneResult } from '@/types'
import { getStage } from '@/lib/scoring'

export async function generateNarrative(
  score: number,
  lanes: LaneResult[],
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return fallbackNarrative(score, lanes)

  const liveLanes = lanes.filter(l => l.status === 'live')
  const lanesSummary = liveLanes
    .map(l => `- ${l.label} (${l.id}): score ${l.score}/100, raw: ${l.rawLabel}`)
    .join('\n')

  const stage = getStage(score)

  const prompt = `You are writing a plain-English summary for a public dashboard called the Agentic Mainstream Meter. It tracks whether AI agents are crossing into mainstream adoption.

Current composite score: ${score}/100
Adoption stage: ${stage.label}
Stage description: ${stage.description}

Signal lanes:
${lanesSummary}

Write 2–3 sentences explaining what the score means right now. Be specific about which signals are moving. Do not hype or speculate. Do not mention the word "proxy." Use plain language a non-technical reader would understand. Do not start with "The score" or "Currently." Vary the opening. Keep it under 60 words.`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 150,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) return fallbackNarrative(score, lanes)
    const data = await res.json()
    const text = data?.content?.[0]?.text ?? ''
    return text.trim() || fallbackNarrative(score, lanes)
  } catch {
    return fallbackNarrative(score, lanes)
  }
}

function fallbackNarrative(score: number, lanes: LaneResult[]): string {
  const stage = getStage(score)
  const live = lanes.filter(l => l.status === 'live')
  if (live.length === 0) return `Score of ${score} — data unavailable across all lanes.`
  const top = [...live].sort((a, b) => b.score - a.score)[0]
  return `Composite score of ${score} places agentic AI in the "${stage.label}" stage. Strongest signal is ${top.label.toLowerCase()} at ${top.score}/100 (${top.rawLabel}).`
}
