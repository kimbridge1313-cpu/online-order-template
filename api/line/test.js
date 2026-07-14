const LINE_PUSH_API = 'https://api.line.me/v2/bot/message/push'

function json(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload, null, 2))
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { ok: false, error: 'method_not_allowed' })

  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
  const notifyTo = process.env.LINE_STORE_NOTIFY_TO || process.env.LINE_STORE_NOTIFY_USER_ID || ''

  const envStatus = {
    hasChannelAccessToken: Boolean(channelAccessToken),
    hasNotifyTarget: Boolean(notifyTo),
    notifyTargetPrefix: notifyTo ? notifyTo.slice(0, 1) : '',
    notifyTargetLength: notifyTo.length
  }

  if (!channelAccessToken || !notifyTo) {
    return json(res, 200, {
      ok: false,
      error: 'missing_env',
      envStatus
    })
  }

  try {
    const lineResponse = await fetch(LINE_PUSH_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${channelAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: notifyTo,
        messages: [
          {
            type: 'text',
            text: `LINE 通知測試成功\n時間：${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}`
          }
        ]
      })
    })

    const responseText = await lineResponse.text()

    if (!lineResponse.ok) {
      return json(res, lineResponse.status, {
        ok: false,
        error: 'line_push_failed',
        envStatus,
        lineStatus: lineResponse.status,
        lineResponse: responseText
      })
    }

    return json(res, 200, {
      ok: true,
      envStatus,
      lineStatus: lineResponse.status
    })
  } catch (error) {
    return json(res, 500, {
      ok: false,
      error: error.message || 'unknown_error',
      envStatus
    })
  }
}
