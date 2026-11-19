// Conexión con Google: inicio de sesión, Drive y Sheets. Sin acceso al correo.
// drive.file: solo los archivos que crea la app · drive.appdata: su archivo oculto de datos
import { CONFIG } from './config.js';

let token = null;
let caduca = 0;
let clienteToken = null;

export const configurado = () => Boolean(CONFIG.CLIENT_ID);
export const conectado = () => Boolean(token) && Date.now() < caduca - 60_000;

function cargarGis() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true; s.onload = res; s.onerror = () => rej(new Error('No se pudo cargar el inicio de sesión de Google. ¿Hay conexión?'));
    document.head.appendChild(s);
  });
}

// Debe llamarse desde un toque del usuario (abre la ventana de Google).
export async function conectar() {
  if (!configurado()) throw new Error('La app aún no tiene configurado el ID de cliente de Google.');
  await cargarGis();
  clienteToken = google.accounts.oauth2.initTokenClient({ client_id: CONFIG.CLIENT_ID, scope: CONFIG.SCOPES, callback: () => {} });
  await new Promise((res, rej) => {
    clienteToken.callback = (r) => {
      if (r.error) return rej(new Error('Google no dio permiso: ' + r.error));
      if (!google.accounts.oauth2.hasGrantedAllScopes(r, ...CONFIG.SCOPES.split(' '))) {
        return rej(new Error('Faltan permisos. Vuelve a conectar y marca todas las casillas.'));
      }
      token = r.access_token; caduca = Date.now() + Number(r.expires_in) * 1000;
      try { localStorage.setItem('pl-google', '1'); } catch {}
      res();
    };
    clienteToken.error_callback = (e) => rej(new Error(e?.type === 'popup_closed' ? 'Se cerró la ventana de Google.' : 'No se pudo conectar con Google.'));
    clienteToken.requestAccessToken({ prompt: '' });
  });
}

// Quita el permiso de la app en la cuenta de Google (no solo olvida la sesión)
export function desconectar() {
  const t = token;
  token = null; caduca = 0;
  try { localStorage.removeItem('pl-google'); } catch {}
  if (!t || !window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((res) => { google.accounts.oauth2.revoke(t, () => res()); setTimeout(res, 4000); });
}
export const conectadoAntes = () => { try { return localStorage.getItem('pl-google') === '1'; } catch { return false; } };

async function api(url, opts = {}) {
  if (!conectado()) await conectar();
  const r = await fetch(url, { ...opts, headers: { ...(opts.headers || {}), Authorization: `Bearer ${token}` } });
  if (r.status === 401) { token = null; throw new Error('La sesión de Google ha caducado. Pulsa «Conectar con Google» y repite.'); }
  if (!r.ok) {
    let msg = ''; try { msg = (await r.json()).error?.message || ''; } catch {}
    throw new Error(`Google respondió con un error (${r.status})${msg ? ': ' + msg : ''}`);
  }
  return r;
}
const json = async (url, opts) => (await api(url, opts)).json();
const DRIVE = 'https://www.googleapis.com/drive/v3';
const SUBIDA = 'https://www.googleapis.com/upload/drive/v3/files';

export const enlaceArchivo = (id) => `https://drive.google.com/file/d/${id}/view`;


async function multipart(meta, cuerpo, tipo, id) {
  const b = 'pl' + Math.random().toString(36).slice(2);
  const blob = new Blob([
    `--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${b}\r\nContent-Type: ${tipo}\r\n\r\n`,
    cuerpo, `\r\n--${b}--`,
  ]);
  const url = id ? `${SUBIDA}/${id}?uploadType=multipart&fields=id` : `${SUBIDA}?uploadType=multipart&fields=id`;
  return json(url, { method: id ? 'PATCH' : 'POST', headers: { 'Content-Type': `multipart/related; boundary=${b}` }, body: blob });
}

// ---------- Datos personales de la app (carpeta oculta) ----------
let idDatos = null;
async function buscarOculto(nombre) {
  const q = encodeURIComponent(`name='${nombre}'`);
  const r = await json(`${DRIVE}/files?spaces=appDataFolder&q=${q}&fields=files(id)`);
  return r.files?.[0]?.id || null;
}
export async function leerDatos() {
  idDatos = await buscarOculto(CONFIG.ARCHIVO_DATOS);
  if (!idDatos) return null;
  return (await api(`${DRIVE}/files/${idDatos}?alt=media`)).json();
}
export async function escribirDatos(obj) {
  const cuerpo = JSON.stringify(obj);
  if (idDatos) return multipart({}, cuerpo, 'application/json', idDatos);
  const r = await multipart({ name: CONFIG.ARCHIVO_DATOS, parents: ['appDataFolder'] }, cuerpo, 'application/json');
  idDatos = r.id; return r;
}

// ---------- Carpetas y archivos ----------
async function existe(id) {
  try { const f = await json(`${DRIVE}/files/${id}?fields=id,trashed`); return !f.trashed; } catch { return false; }
}
async function crearCarpeta(nombre, padre) {
  const meta = { name: nombre, mimeType: 'application/vnd.google-apps.folder', ...(padre ? { parents: [padre] } : {}) };
  return (await json(`${DRIVE}/files?fields=id`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(meta) })).id;
}
// ruta: ['Flexeo', 'Hexaflex', 'Audios']; cache: objeto donde se guardan los ids
export async function carpeta(ruta, cache) {
  let padre = null;
  for (let i = 0; i < ruta.length; i++) {
    const k = ruta.slice(0, i + 1).join('/');
    let id = cache[k];
    if (!id || !(await existe(id))) { id = await crearCarpeta(ruta[i], padre); cache[k] = id; }
    padre = id;
  }
  return padre;
}
export async function subirArchivo(nombre, blob, tipo, padre) {
  return (await multipart({ name: nombre, parents: [padre] }, blob, tipo)).id;
}
// Subida de archivos grandes (audios y vídeos) en dos pasos
export async function subirGrande(nombre, blob, tipo, padre) {
  if (blob.size < 4_000_000) return subirArchivo(nombre, blob, tipo, padre);
  const r = await api(`${SUBIDA}?uploadType=resumable&fields=id`, {
    method: 'POST', headers: { 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': tipo, 'X-Upload-Content-Length': String(blob.size) },
    body: JSON.stringify({ name: nombre, parents: [padre] }),
  });
  const destino = r.headers.get('Location');
  if (!destino) throw new Error('Google no devolvió la dirección de subida. Inténtalo de nuevo.');
  const r2 = await fetch(destino, { method: 'PUT', headers: { 'Content-Type': tipo }, body: blob });
  if (!r2.ok) throw new Error(`No se pudo subir el archivo (${r2.status}).`);
  return (await r2.json()).id;
}
export async function borrarArchivo(id) {
  try { await api(`${DRIVE}/files/${id}`, { method: 'DELETE' }); } catch (e) { if (!/\((404|410)\)/.test(e.message)) throw e; }
}
export async function descargarArchivo(id) {
  return (await api(`${DRIVE}/files/${id}?alt=media`)).arrayBuffer();
}
