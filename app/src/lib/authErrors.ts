const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'User already registered': 'Este e-mail já está cadastrado. Tente entrar.',
  'Email not confirmed': 'Confirme seu e-mail antes de entrar.',
  'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres.',
  'Unable to validate email address: invalid format': 'Informe um e-mail válido.',
}

const DEFAULT_MESSAGE = 'Não foi possível concluir. Verifique os dados e tente novamente.'

export function translateAuthError(message: string): string {
  return AUTH_ERROR_MESSAGES[message] ?? DEFAULT_MESSAGE
}
