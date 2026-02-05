// Utilities for talking to the user's context server.

import { addRequestLog, getDeviceId, getDeviceSecret, store } from '../store'

type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

type JsonRequestOptions = {
  path: string
  method?: ApiMethod
  body?: unknown
}

type FormDataRequestOptions = {
  path: string
  formData: FormData
}

function getAuthHeaders(): Record<string, string> {
  const secret = getDeviceSecret()
  if (!secret) {
    throw new Error('Device secret is not set')
  }

  return {
    'x-device-id': getDeviceId(),
    Authorization: `Bearer ${secret}`,
  }
}

function getBaseUrl(): string | null {
  return store.get('serverUrl')
}

export async function apiRequest<T = unknown>({
  path,
  method = 'POST',
  body,
}: JsonRequestOptions): Promise<
  { data: T } | { error: string; errorStatus: number }
> {
  const baseUrl = getBaseUrl()
  if (!baseUrl) {
    throw new Error('Server URL is not set')
  }

  const url = `${getBaseUrl()}${path}`
  const startTime = Date.now()

  let response: Response
  try {
    response = await fetch(url, {
      method,
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.log(`url: ${url}`)
    const message = error instanceof Error ? error.message : 'Network error'
    addRequestLog({
      timestamp: startTime,
      method,
      url,
      isError: true,
      duration: Date.now() - startTime,
      text: message,
    })
    return { error: message, errorStatus: 0 }
  }

  const duration = Date.now() - startTime

  if (!response.ok) {
    const text = await response.text()
    console.log(
      'apiRequest to',
      url,
      'failed:',
      text,
      'status:',
      response.status,
    )
    addRequestLog({
      timestamp: startTime,
      method,
      url,
      isError: true,
      status: response.status,
      duration,
      text: text.slice(0, 500),
    })

    return { error: text, errorStatus: response.status }
  }

  addRequestLog({
    timestamp: startTime,
    method,
    url,
    isError: false,
    status: response.status,
    duration,
  })

  const text = await response.text()

  let json: T
  try {
    json = JSON.parse(text) as T
  } catch {
    console.log(
      'apiRequest to',
      url,
      `failed with invalid JSON response ${text.slice(0, 500)}${text.length > 500 ? '...' : ''}`,
    )
    return { error: 'Invalid JSON response', errorStatus: response.status }
  }
  return { data: json }
}

export async function apiFormDataRequest<T = unknown>({
  path,
  formData,
}: FormDataRequestOptions): Promise<T> {
  const baseUrl = getBaseUrl()
  if (!baseUrl) {
    throw new Error('Server URL is not set')
  }

  const url = `${baseUrl}${path}`
  const startTime = Date.now()

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: getAuthHeaders(),
    })
  } catch (error) {
    console.log(`url: ${url}`)
    addRequestLog({
      timestamp: startTime,
      method: 'POST',
      url,
      isError: true,
      duration: Date.now() - startTime,
      text: error instanceof Error ? error.message : 'Network error',
    })
    throw error
  }

  const duration = Date.now() - startTime

  if (!response.ok) {
    const text = await response.text()
    addRequestLog({
      timestamp: startTime,
      method: 'POST',
      url,
      isError: true,
      status: response.status,
      duration,
      text: text.slice(0, 500),
    })
    throw new Error(`Request failed: ${response.status} ${response.statusText}`)
  }

  addRequestLog({
    timestamp: startTime,
    method: 'POST',
    url,
    isError: false,
    status: response.status,
    duration,
  })

  const contentType = response.headers.get('content-type')
  if (contentType?.includes('application/json')) {
    return response.json() as Promise<T>
  }

  return undefined as T
}
