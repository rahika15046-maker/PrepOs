/*
 * LinkedIn OAuth — "Sign In with LinkedIn using OpenID Connect".
 *
 * This is authentication-only. It lets PrepOS verify who the user is
 * and read their basic profile (name, sub, email if granted). It does
 * NOT grant permission to post on the user's behalf — LinkedIn's
 * OpenID Connect product does not include posting scopes, so PrepOS
 * never claims to auto-publish anything.
 */

const AUTHORIZATION_ENDPOINT =
  'https://www.linkedin.com/oauth/v2/authorization'

const TOKEN_ENDPOINT =
  'https://www.linkedin.com/oauth/v2/accessToken'

const USERINFO_ENDPOINT =
  'https://api.linkedin.com/v2/userinfo'

const SCOPES = 'openid profile email'

function getConfig() {
  return {
    clientId: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    redirectUri: process.env.LINKEDIN_REDIRECT_URI,
  }
}

export function isConfigured() {
  const { clientId, clientSecret, redirectUri } =
    getConfig()

  return Boolean(
    clientId &&
      clientSecret &&
      redirectUri
  )
}

export function buildAuthorizationUrl(state) {
  const { clientId, redirectUri } =
    getConfig()

  if (!clientId || !redirectUri) {
    throw new Error(
      'LinkedIn OAuth is not configured on this server.'
    )
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: SCOPES,
    state,
  })

  return `${AUTHORIZATION_ENDPOINT}?${params.toString()}`
}

export async function exchangeCodeForToken(code) {
  const { clientId, clientSecret, redirectUri } =
    getConfig()

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      'LinkedIn OAuth is not configured on this server.'
    )
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  })

  const controller = new AbortController()

  const timeout = setTimeout(
    () => controller.abort(),
    15000
  )

  let response

  try {
    response = await fetch(
      TOKEN_ENDPOINT,
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/x-www-form-urlencoded',
        },
        body: body.toString(),
        signal: controller.signal,
      }
    )
  } finally {
    clearTimeout(timeout)
  }

  const raw = await response.text()

  if (!response.ok) {
    throw new Error(
      `LinkedIn token exchange failed (${response.status}): ${raw.slice(0, 500)}`
    )
  }

  let data

  try {
    data = JSON.parse(raw)
  } catch {
    throw new Error(
      'LinkedIn token exchange returned an unexpected response.'
    )
  }

  if (!data.access_token) {
    throw new Error(
      'LinkedIn token exchange did not return an access token.'
    )
  }

  return data
}

export async function fetchUserInfo(accessToken) {
  if (!accessToken) {
    throw new Error(
      'Missing LinkedIn access token.'
    )
  }

  const controller = new AbortController()

  const timeout = setTimeout(
    () => controller.abort(),
    15000
  )

  let response

  try {
    response = await fetch(
      USERINFO_ENDPOINT,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        signal: controller.signal,
      }
    )
  } finally {
    clearTimeout(timeout)
  }

  const raw = await response.text()

  if (!response.ok) {
    throw new Error(
      `LinkedIn profile request failed (${response.status}): ${raw.slice(0, 500)}`
    )
  }

  let data

  try {
    data = JSON.parse(raw)
  } catch {
    throw new Error(
      'LinkedIn profile request returned an unexpected response.'
    )
  }

  if (!data.sub) {
    throw new Error(
      'LinkedIn profile response did not include a subject identifier.'
    )
  }

  return data
}
