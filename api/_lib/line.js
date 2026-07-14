const LINE_PUSH_API = 'https://api.line.me/v2/bot/message/push'

export function json(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload, null, 2))
}

export function getLineEnvStatus() {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
  const notifyTo = process.env.LINE_STORE_NOTIFY_TO || process.env.LINE_STORE_NOTIFY_USER_ID || ''
  return {
    channelAccessToken,
    notifyTo,
    envStatus: {
      hasChannelAccessToken: Boolean(channelAccessToken),
      hasNotifyTarget: Boolean(notifyTo),
      notifyTargetPrefix: notifyTo ? notifyTo.slice(0, 1) : '',
      notifyTargetLength: notifyTo.length
    }
  }
}

export function normalizeLineMessages(messages = []) {
  return messages
    .filter(Boolean)
    .slice(0, 5)
    .map((message) => {
      if (message.type === 'flex' && message.contents) {
        return {
          type: 'flex',
          altText: String(message.altText || '線上訂餐通知').slice(0, 400),
          contents: message.contents
        }
      }
      return {
        type: 'text',
        text: String(message.text || '').slice(0, 5000)
      }
    })
    .filter((message) => message.type === 'flex' || message.text)
}

export async function pushLineMessages({ to, messages }) {
  const { channelAccessToken } = getLineEnvStatus()
  if (!channelAccessToken) {
    const error = new Error('missing_line_channel_access_token')
    error.code = 'missing_line_channel_access_token'
    throw error
  }
  if (!to) {
    return { ok: true, skipped: true, reason: 'missing_line_notify_target' }
  }

  const normalizedMessages = normalizeLineMessages(messages)
  if (normalizedMessages.length === 0) {
    const error = new Error('missing_messages')
    error.code = 'missing_messages'
    throw error
  }

  const lineResponse = await fetch(LINE_PUSH_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${channelAccessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ to, messages: normalizedMessages })
  })

  const responseText = await lineResponse.text()
  if (!lineResponse.ok) {
    const error = new Error('line_push_failed')
    error.code = 'line_push_failed'
    error.status = lineResponse.status
    error.lineResponse = responseText
    throw error
  }

  return { ok: true, lineStatus: lineResponse.status }
}
