import crypto from 'crypto'

export default function requestId(req, res, next) {
  const incoming = req.get('X-Request-ID')

  const id =
    incoming &&
    incoming.length <= 100 &&
    /^[a-zA-Z0-9._:-]+$/.test(incoming)
      ? incoming
      : crypto.randomUUID()

  req.requestId = id

  res.setHeader(
    'X-Request-ID',
    id
  )

  next()
}