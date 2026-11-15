// Configuración de Portland Lab.
// CLIENT_ID: el mismo «ID de cliente» de Google Cloud que Luria Lab (las dos apps viven en
// https://marcomrmr08-lgtm.github.io, que ya es un origen autorizado). Mientras esté vacío,
// la app funciona en modo prueba: guarda todo solo en este dispositivo.
export const CONFIG = {
  CLIENT_ID: '632485670315-44h0reldorhd0pc09qvivhc9qdj3cdhv.apps.googleusercontent.com',
  // Sin acceso al correo: solo los archivos que crea la app y su archivo oculto de datos.
  SCOPES: [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.appdata',
  ].join(' '),
  ARCHIVO_DATOS: 'portland-lab-datos.json',
  // Archivo de datos de Luria Lab (mismo ID de cliente → misma carpeta oculta): solo se lee para importar fichas
  ARCHIVO_LURIA: 'luria-lab-datos.json',
  CARPETA_RAIZ: 'Portland Lab',
  URL_APP: 'https://marcomrmr08-lgtm.github.io/portlandlab/',
};
