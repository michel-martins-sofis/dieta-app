import { describe, it, expect } from 'vitest'
import { translateAuthError } from './authErrors'

describe('translateAuthError', () => {
  it('translates known Supabase auth error messages to friendly Portuguese text', () => {
    expect(translateAuthError('Invalid login credentials')).toBe('E-mail ou senha incorretos.')
    expect(translateAuthError('User already registered')).toBe('Este e-mail já está cadastrado. Tente entrar.')
  })

  it('falls back to a generic friendly message for unknown errors', () => {
    expect(translateAuthError('Some unexpected provider error')).toBe(
      'Não foi possível concluir. Verifique os dados e tente novamente.'
    )
  })
})
