const LINE_PUSH_API = 'https://api.line.me/v2/bot/message/push'

function json(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function normalizeMessages(messages = []) {
  return messages
    .filter((message) => message && message.text)
    .slice(0, 5)
    .map((message) => ({
      type: 'text',
      text: String(message.text).slice(0, 5000)
    }))
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method_not_allowed' })

  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!channelAccessToken) return json(res, 500, { ok: false, error: 'missing_line_channel_access_token' })

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const to = body.to
    const messages = normalizeMessages(body.messages)

    if (!to) return json(res, 400, { ok: false, error: 'missing_to' })
    if (messages.length === 0) return json(res, 400, { ok: false, error: 'missing_messages' })

    const lineResponse = await fetch(LINE_PUSH_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${channelAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ to, messages })
    })

    const responseText = await lineResponse.text()
    if (!lineResponse.ok) {
      return json(res, lineResponse.status, {
        ok: false,
        error: 'line_push_failed',
        detail: responseText
      })
    }

    return json(res, 200, { ok: true })
  } catch (error) {
    return json(res, 500, { ok: false, error: error.message || 'unknown_error' })
  }
}
