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
    addRequestLog({
      timestamp: startTime,
      method,
      path,
      status: 'error',
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Network error',
    })
    throw error
  }

  const duration = Date.now() - startTime

  if (!response.ok) {
    addRequestLog({
      timestamp: startTime,
      method,
      path,
      status: 'error',
      statusCode: response.status,
      duration,
      error: `${response.status} ${response.statusText}`,
    })

    const text = await response.text()
    return { error: text, errorStatus: response.status }
  }

  addRequestLog({
    timestamp: startTime,
    method,
    path,
    status: 'success',
    statusCode: response.status,
    duration,
  })

  // const contentType = response.headers.get('content-type')
  // if (!contentType || !contentType.includes('application/json')) {
  //   const text = await response.text()
  //   return { data: text as T }
  // }

  const json = (await response.json()) as T
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
    addRequestLog({
      timestamp: startTime,
      method: 'POST',
      path,
      status: 'error',
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Network error',
    })
    throw error
  }

  const duration = Date.now() - startTime

  if (!response.ok) {
    addRequestLog({
      timestamp: startTime,
      method: 'POST',
      path,
      status: 'error',
      statusCode: response.status,
      duration,
      error: `${response.status} ${response.statusText}`,
    })
    throw new Error(`Request failed: ${response.status} ${response.statusText}`)
  }

  addRequestLog({
    timestamp: startTime,
    method: 'POST',
    path,
    status: 'success',
    statusCode: response.status,
    duration,
  })

  const contentType = response.headers.get('content-type')
  if (contentType?.includes('application/json')) {
    return response.json() as Promise<T>
  }

  return undefined as T
}
