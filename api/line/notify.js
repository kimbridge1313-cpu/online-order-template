import { json, pushLineMessages } from '../_lib/line.js'

function resolveTarget(body = {}) {
  if (body.to) return body.to
  if (body.target === 'store') {
    return process.env.LINE_STORE_NOTIFY_TO || process.env.LINE_STORE_NOTIFY_USER_ID || ''
  }
  return ''
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method_not_allowed' })

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const result = await pushLineMessages({
      to: resolveTarget(body),
      messages: body.messages || []
    })
    return json(res, 200, result)
  } catch (error) {
    return json(res, error.status || 500, {
      ok: false,
      error: error.code || error.message || 'unknown_error',
      detail: error.lineResponse || ''
    })
  }
}
