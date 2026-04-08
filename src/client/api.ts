export async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init)
  const payload = (await response.json()) as T & { error?: string }

  if (!response.ok) {
    throw new Error((payload as { error?: string }).error || 'Request failed.')
  }

  return payload
}
