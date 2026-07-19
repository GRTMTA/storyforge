import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY') ?? ''
const MODEL = 'llama-3.3-70b-versatile'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  text: string
  context: 'setting' | 'character_description' | 'guardrail'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text, context }: RequestBody = await req.json()

    if (!text?.trim()) {
      return new Response(JSON.stringify({ error: 'No text provided' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const contextPrompts: Record<RequestBody['context'], string> = {
      setting: `You are a writing assistant helping improve a story setting description. 
Polish the following text: fix grammar, remove repetition, improve clarity and vividness. 
Preserve ALL original ideas and intent — do not invent new concepts or change the meaning.
Return ONLY a JSON object: { "polished": "improved text here" }`,

      character_description: `You are a writing assistant helping improve a character description for an interactive story.
Polish the following text: fix grammar, remove repetition, make it more vivid and concise.
Preserve ALL original ideas, personality traits, and intent — do not change who this character is.
Return ONLY a JSON object: { "polished": "improved text here" }`,

      guardrail: `You are a writing assistant helping improve a story guardrail rule.
Polish the following rule: make it clear, specific, and actionable for an AI narrator.
Preserve the original intent — do not change what is being restricted or enforced.
Return ONLY a JSON object: { "polished": "improved rule here" }`,
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: contextPrompts[context] },
          { role: 'user', content: text },
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Groq error ${response.status}: ${err}`)
    }

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw)

    return new Response(JSON.stringify({ polished: parsed.polished ?? text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
