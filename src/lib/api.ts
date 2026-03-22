import { NextResponse } from 'next/server'

// Standard response shape: { data, error, meta }
export function ok<T>(data: T, meta?: Record<string, unknown>) {
  return NextResponse.json({ data, error: null, meta: meta ?? null })
}

export function err(message: string, status: number = 400) {
  return NextResponse.json({ data: null, error: message, meta: null }, { status })
}

export function unauthorized() {
  return err('Unauthorized', 401)
}

export function forbidden() {
  return err('Forbidden', 403)
}

export function notFound(resource = 'Resource') {
  return err(`${resource} not found`, 404)
}

export function serverError(e: unknown) {
  console.error(e)
  return err('Internal server error', 500)
}
