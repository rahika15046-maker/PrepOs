const BASE_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000/api'

function buildUrl(path) {
  if (/^https?:\/\//i.test(path)) {
    return path
  }

  return `${BASE_URL.replace(/\/$/, '')}/${String(
    path
  ).replace(/^\//, '')}`
}

async function parseResponse(response) {
  const contentType =
    response.headers.get(
      'content-type'
    ) || ''

  let data

  if (
    contentType.includes(
      'application/json'
    )
  ) {
    data = await response.json()
  } else {
    const text =
      await response.text()

    data = text
      ? { message: text }
      : {}
  }

  if (!response.ok) {
    const error =
      new Error(
        data?.error?.message ||
        data?.message ||
        (typeof data?.error === 'string' ? data.error : null) ||
        'Request failed.'
      )

    error.status =
      response.status

    error.code =
      data?.error?.code ||
      data?.code

    error.details =
      data?.error?.details ||
      data?.details

    error.requestId =
      data?.error?.requestId ||
      data?.requestId ||
      response.headers.get(
        'x-request-id'
      )

    throw error
  }

  return data
}

async function request(
  path,
  options = {}
) {
  const {
    isForm = false,
    ...fetchOptions
  } = options

  const headers = new Headers(
    fetchOptions.headers || {}
  )

  if (!isForm) {
    headers.set(
      'Content-Type',
      'application/json'
    )
  }

  const token =
    localStorage.getItem(
      'prepos-token'
    )

  if (token) {
    headers.set(
      'Authorization',
      `Bearer ${token}`
    )
  }

  const response =
    await fetch(
      buildUrl(path),
      {
        ...fetchOptions,
        headers,
        credentials: 'include',
      }
    )

  return parseResponse(
    response
  )
}

export const api = {
  get(path, options = {}) {
    return request(path, {
      ...options,
      method: 'GET',
    })
  },

  post(
    path,
    body,
    options = {}
  ) {
    const isForm =
      options.isForm === true

    return request(path, {
      ...options,
      method: 'POST',
      body:
        isForm
          ? body
          : body === undefined
            ? undefined
            : JSON.stringify(body),
    })
  },

  put(
    path,
    body,
    options = {}
  ) {
    const isForm =
      options.isForm === true

    return request(path, {
      ...options,
      method: 'PUT',
      body:
        isForm
          ? body
          : body === undefined
            ? undefined
            : JSON.stringify(body),
    })
  },

  patch(
    path,
    body,
    options = {}
  ) {
    const isForm =
      options.isForm === true

    return request(path, {
      ...options,
      method: 'PATCH',
      body:
        isForm
          ? body
          : body === undefined
            ? undefined
            : JSON.stringify(body),
    })
  },

  delete(
    path,
    options = {}
  ) {
    return request(path, {
      ...options,
      method: 'DELETE',
    })
  },

  getToken() {
    return localStorage.getItem('prepos-token')
  },

  setToken(token) {
    localStorage.setItem('prepos-token', token)
  },

  clearToken() {
    localStorage.removeItem('prepos-token')
  },
}

export default api