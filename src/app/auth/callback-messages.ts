const messages = {
  es: {
    processing: 'Procesando autenticación...',
    authError: 'Error al procesar autenticación',
    sessionFailed: 'No se pudo completar el inicio de sesión. Por favor, inténtalo de nuevo.',
    linkExpired: 'El enlace ha expirado o ya fue utilizado. Por favor, inicia sesión de nuevo.',
    accountSuspended: 'Tu cuenta ha sido suspendida. Por favor, contacta al administrador.',
    unexpectedError: 'Error inesperado al procesar autenticación',
    accessDenied: 'Acceso Denegado',
  },
  en: {
    processing: 'Processing authentication...',
    authError: 'Error processing authentication',
    sessionFailed: 'Could not complete sign-in. Please try again.',
    linkExpired: 'The link has expired or was already used. Please sign in again.',
    accountSuspended: 'Your account has been suspended. Please contact the administrator.',
    unexpectedError: 'Unexpected error processing authentication',
    accessDenied: 'Access Denied',
  },
  pt: {
    processing: 'A processar autenticação...',
    authError: 'Erro ao processar autenticação',
    sessionFailed: 'Não foi possível completar o início de sessão. Por favor, tente novamente.',
    linkExpired: 'O link expirou ou já foi utilizado. Por favor, inicie sessão novamente.',
    accountSuspended: 'A sua conta foi suspensa. Por favor, contacte o administrador.',
    unexpectedError: 'Erro inesperado ao processar autenticação',
    accessDenied: 'Acesso Negado',
  },
} as const;

export type CallbackMessageKey = keyof typeof messages.es;

export function getCallbackMessage(locale: string, key: CallbackMessageKey): string {
  const loc = (locale in messages ? locale : 'es') as keyof typeof messages;
  return messages[loc][key];
}
