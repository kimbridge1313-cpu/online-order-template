import { getLineEnvStatus, json, pushLineMessages } from '../_lib/line.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { ok: false, error: 'method_not_allowed' })

  const { channelAccessToken, notifyTo, envStatus } = getLineEnvStatus()

  if (!channelAccessToken || !notifyTo) {
    return json(res, 200, {
      ok: false,
      error: 'missing_env',
      envStatus
    })
  }

  try {
    const result = await pushLineMessages({
      to: notifyTo,
      messages: [
        {
          type: 'text',
          text: `LINE 通知測試成功\n時間：${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}`
        }
      ]
    })

    return json(res, 200, {
      ...result,
      envStatus
    })
  } catch (error) {
    return json(res, error.status || 500, {
      ok: false,
      error: error.code || error.message || 'unknown_error',
      envStatus,
      lineStatus: error.status || null,
      lineResponse: error.lineResponse || ''
    })
  }
}
