// © 2026 Marco Martínez. Todos los derechos reservados. Ver LICENSE.
// Configuración de Flexeo.
// CLIENT_ID: el mismo «ID de cliente» de Google Cloud que Luria Lab (las dos apps viven en
// https://marcomrmr08-lgtm.github.io, que ya es un origen autorizado). Mientras esté vacío,
// la app funciona en modo prueba: guarda todo solo en este dispositivo.
export const CONFIG = {
  CLIENT_ID: '1006302280856-8pko1mot95b2r44403jhh45342c3k79m.apps.googleusercontent.com',
  // Sin acceso al correo: solo los archivos que crea la app y su archivo oculto de datos.
  SCOPES: [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.appdata',
  ].join(' '),
  ARCHIVO_DATOS: 'portland-lab-datos.json',
  CARPETA_RAIZ: 'Flexeo',
  URL_APP: 'https://marcomrmr08-lgtm.github.io/portlandlab/',
};
