/* PDFPro — gmail-hora/errores.js (v3.1.9)
 * Errores tipados del módulo (tomados del módulo original
 * «gmail-hora-recepcion» provisto por el usuario, sin cambios de
 * comportamiento). */
'use strict';

/** Error base del módulo. */
class GmailHoraError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'GmailHoraError';
    this.details = details;
  }
}

/** No se detectó sesión de Gmail dentro del tiempo esperado. */
class LoginRequeridoError extends GmailHoraError {
  constructor(message = 'No se detectó inicio de sesión en Gmail.', details = {}) {
    super(message, details);
    this.name = 'LoginRequeridoError';
  }
}

/** No se encontró ningún correo con el archivo indicado. */
class ArchivoNoEncontradoError extends GmailHoraError {
  constructor(archivo, details = {}) {
    super(`No se encontró ningún correo con el archivo "${archivo}".`, { archivo, ...details });
    this.name = 'ArchivoNoEncontradoError';
  }
}

/** El correo se abrió pero no se pudo leer la hora de recepción. */
class HoraNoExtraidaError extends GmailHoraError {
  constructor(details = {}) {
    super('No se pudo extraer la hora de recepción del correo.', details);
    this.name = 'HoraNoExtraidaError';
  }
}

/** El servicio no fue iniciado (o ya fue cerrado). */
class ServicioNoIniciadoError extends GmailHoraError {
  constructor() {
    super('El servicio no está iniciado. Llama a iniciar() primero.', {});
    this.name = 'ServicioNoIniciadoError';
  }
}

module.exports = { GmailHoraError, LoginRequeridoError, ArchivoNoEncontradoError, HoraNoExtraidaError, ServicioNoIniciadoError };
