import type { AiDecision, ModelConfig } from '../game/types'
import type { AiBidDecision } from '../game/types'

export interface ChatMessage {
  role: 'system' | 'user'
  content: string
}

const buildOpenAIEndpoint = (baseUrl: string) => {
  const trimmed = baseUrl.replace(/\/+$/, '')
  if (/\/v1\/chat\/completions$/i.test(trimmed)) return trimmed
  if (/\/chat\/completions$/i.test(trimmed)) return trimmed
  if (/\/v1$/i.test(trimmed)) return `${trimmed}/chat/completions`
  return `${trimmed}/v1/chat/completions`
}

const buildGeminiEndpoint = (baseUrl: string, model: string) => {
  const trimmed = baseUrl.replace(/\/+$/, '')
  const base = /\/v1(beta)?$/i.test(trimmed) ? trimmed : `${trimmed}/v1beta`
  return `${base}/models/${model}:generateContent`
}

const isGemini = (config: ModelConfig) => config.vendor?.startsWith('gemini')

const toGeminiPrompt = (messages: ChatMessage[]) =>
  messages
    .map((m) => `[${m.role}] ${m.content}`)
    .join('\n\n')

export async function callLLM(config: ModelConfig, messages: ChatMessage[]): Promise<AiDecision | null> {
  if (!config.baseUrl || !config.model || !config.apiKey) return null
  const useGemini = isGemini(config)
  const url = useGemini ? buildGeminiEndpoint(config.baseUrl, config.model) : buildOpenAIEndpoint(config.baseUrl)
  const payload = useGemini
    ? {
        contents: [{ role: 'user', parts: [{ text: toGeminiPrompt(messages) }] }],
        generationConfig: { temperature: 0.3 },
      }
    : {
        model: config.model,
        messages,
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.apiKey}`,
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  const text = await res.text()

  if (!res.ok) {
    let detail = text
    try {
      const json = JSON.parse(text)
      detail = json?.error?.message || json?.message || text
    } catch {
      // keep text
    }
    throw new Error(`LLM 请求失败: ${res.status} ${res.statusText}: ${detail}`)
  }

  if (useGemini) {
    let data: { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; choices?: Array<{ message?: { content?: string } }> } = {}
    try {
      data = JSON.parse(text) as typeof data
    } catch {
      throw new Error('LLM 返回非 JSON 内容')
    }
    const content =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || data?.choices?.[0]?.message?.content || ''
    if (!content) return null
    try {
      const parsed = JSON.parse(content) as AiDecision
      if (parsed.action === 'play' || parsed.action === 'pass') {
        return parsed
      }
    } catch (err) {
      console.warn('LLM 返回内容无法解析', err)
    }
    return null
  }

  let data: { choices?: Array<{ message?: { content?: string } }> } = {}
  try {
    data = JSON.parse(text) as typeof data
  } catch {
    throw new Error('LLM 返回非 JSON 内容')
  }
  const content = data?.choices?.[0]?.message?.content
  if (!content) return null

  try {
    const parsed = JSON.parse(content) as AiDecision
    if (parsed.action === 'play' || parsed.action === 'pass') {
      return parsed
    }
  } catch (err) {
    console.warn('LLM 返回内容无法解析', err)
  }
  return null
}

export async function callBidLLM(config: ModelConfig, messages: ChatMessage[]): Promise<AiBidDecision | null> {
  if (!config.baseUrl || !config.model || !config.apiKey) return null
  const useGemini = isGemini(config)
  const url = useGemini ? buildGeminiEndpoint(config.baseUrl, config.model) : buildOpenAIEndpoint(config.baseUrl)
  const payload = useGemini
    ? {
        contents: [{ role: 'user', parts: [{ text: toGeminiPrompt(messages) }] }],
        generationConfig: { temperature: 0.2 },
      }
    : {
        model: config.model,
        messages,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.apiKey}`,
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  const text = await res.text()
  if (!res.ok) {
    let detail = text
    try {
      const json = JSON.parse(text)
      detail = json?.error?.message || json?.message || text
    } catch {
      // keep text
    }
    throw new Error(`LLM 请求失败: ${res.status} ${res.statusText}: ${detail}`)
  }

  if (useGemini) {
    let data: { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; choices?: Array<{ message?: { content?: string } }> } = {}
    try {
      data = JSON.parse(text) as typeof data
    } catch {
      throw new Error('LLM 返回非 JSON 内容')
    }
    const content =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || data?.choices?.[0]?.message?.content || ''
    if (!content) return null
    try {
      const parsed = JSON.parse(content) as AiBidDecision
      if ([0, 1, 2, 3].includes(parsed.bid)) return parsed
    } catch (err) {
      console.warn('LLM 叫分返回无法解析', err)
    }
    return null
  }

  let data: { choices?: Array<{ message?: { content?: string } }> } = {}
  try {
    data = JSON.parse(text) as typeof data
  } catch {
    throw new Error('LLM 返回非 JSON 内容')
  }
  const content = data?.choices?.[0]?.message?.content
  if (!content) return null
  try {
    const parsed = JSON.parse(content) as AiBidDecision
    if ([0, 1, 2, 3].includes(parsed.bid)) return parsed
  } catch (err) {
    console.warn('LLM 叫分返回无法解析', err)
  }
  return null
}
