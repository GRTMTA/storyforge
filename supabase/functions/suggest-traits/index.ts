import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY') ?? ''
const MODEL = 'llama-3.3-70b-versatile'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { characterName, role, existingTraits }: {
      characterName: string
      role: string
      existingTraits: string[]
    } = await req.json()

    const prompt = `You are helping a writer create character traits for an interactive story character.
Character: ${characterName || 'Unknown'} (${role})
Already assigned traits: ${existingTraits.length ? existingTraits.join(', ') : 'none'}

Suggest 8 diverse, interesting personality traits that would suit this character.
Do NOT repeat existing traits. Mix positive, negative, and neutral traits.
Return ONLY a JSON object: { "suggestions": ["trait1", "trait2", ...] }`

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
        max_tokens: 200,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) throw new Error(`Groq error ${response.status}`)

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw)

    return new Response(JSON.stringify({ suggestions: parsed.suggestions ?? [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return new Response(JSON.stringify({ error: message, suggestions: [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
