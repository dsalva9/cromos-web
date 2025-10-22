/**
 * Centralized error messages for consistent user experience
 * All messages are in Spanish for the target audience
 */

export const ERROR_MESSAGES = {
  // Network & Connection Errors
  NETWORK: 'Error de conexión. Por favor, verifica tu internet.',
  TIMEOUT: 'La solicitud ha tardado demasiado. Inténtalo de nuevo.',
  SERVER_ERROR: 'Error del servidor. Por favor, inténtalo más tarde.',

  // Authentication Errors
  UNAUTHORIZED: 'No tienes permiso para realizar esta acción.',
  UNAUTHENTICATED: 'Debes iniciar sesión para continuar.',
  SESSION_EXPIRED: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',

  // Resource Errors
  NOT_FOUND: 'El recurso solicitado no existe.',
  ALREADY_EXISTS: 'Este recurso ya existe.',
  DELETED: 'Este recurso ha sido eliminado.',

  // Validation Errors
  INVALID_INPUT: 'Los datos ingresados no son válidos.',
  MISSING_REQUIRED: 'Faltan campos obligatorios.',
  INVALID_FORMAT: 'El formato de los datos no es correcto.',

  // Marketplace Errors
  LISTING_CREATE_FAILED: 'Error al crear el anuncio. Inténtalo de nuevo.',
  LISTING_UPDATE_FAILED: 'Error al actualizar el anuncio.',
  LISTING_DELETE_FAILED: 'Error al eliminar el anuncio.',
  LISTING_NOT_FOUND: 'El anuncio no existe o ha sido eliminado.',

  // Template Errors
  TEMPLATE_CREATE_FAILED: 'Error al crear la plantilla. Inténtalo de nuevo.',
  TEMPLATE_COPY_FAILED: 'Error al copiar la plantilla.',
  TEMPLATE_NOT_FOUND: 'La plantilla no existe.',
  TEMPLATE_EMPTY_SLOTS: 'Debe añadir al menos un cromo a la página.',

  // Upload Errors
  UPLOAD_FAILED: 'Error al subir la imagen. Inténtalo de nuevo.',
  FILE_TOO_LARGE: 'El archivo es demasiado grande. Tamaño máximo: 5MB.',
  INVALID_FILE_TYPE: 'Tipo de archivo no válido. Usa JPG, PNG o WebP.',

  // User Errors
  USER_NOT_FOUND: 'Usuario no encontrado.',
  PROFILE_UPDATE_FAILED: 'Error al actualizar el perfil.',

  // Trade Errors
  TRADE_CREATE_FAILED: 'Error al crear la propuesta de intercambio.',
  TRADE_NOT_FOUND: 'La propuesta de intercambio no existe.',

  // Generic Errors
  UNKNOWN_ERROR: 'Ha ocurrido un error inesperado.',
  TRY_AGAIN: 'Por favor, inténtalo de nuevo.',
} as const;

/**
 * Success messages for positive user feedback
 */
export const SUCCESS_MESSAGES = {
  // Marketplace
  LISTING_CREATED: '¡Anuncio publicado con éxito!',
  LISTING_UPDATED: '¡Anuncio actualizado con éxito!',
  LISTING_DELETED: 'Anuncio eliminado con éxito',

  // Templates
  TEMPLATE_CREATED: '¡Plantilla creada con éxito!',
  TEMPLATE_COPIED: '¡Plantilla copiada con éxito!',
  TEMPLATE_UPDATED: '¡Plantilla actualizada con éxito!',

  // Progress
  PROGRESS_UPDATED: '¡Actualizado!',

  // Upload
  IMAGE_UPLOADED: 'Imagen subida con éxito',

  // Profile
  PROFILE_UPDATED: 'Perfil actualizado con éxito',

  // Generic
  SAVED: 'Guardado con éxito',
  DELETED: 'Eliminado con éxito',
} as const;

/**
 * Helper function to get error message from Error object
 *
 * @param error - Error object or unknown type
 * @param fallback - Fallback message if error message cannot be extracted
 * @returns User-friendly error message in Spanish
 */
export function getErrorMessage(error: unknown, fallback: string = ERROR_MESSAGES.UNKNOWN_ERROR): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return fallback;
}

/**
 * Helper function to check if error is a specific type
 *
 * @param error - Error object
 * @param code - Error code to check
 * @returns Boolean indicating if error matches the code
 */
export function isErrorCode(error: unknown, code: string): boolean {
  if (typeof error === 'object' && error !== null) {
    const e = error as { code?: string; status?: string };
    return e.code === code || e.status === code;
  }
  return false;
}
