// © 2026 Marco Martínez. Todos los derechos reservados. Ver LICENSE.
// Datos de Flexeo: Hexaflex, biblioteca (apuntes y lecturas), diario y role plays.
// Se guardan siempre en este dispositivo y, si hay conexión con Google, en un archivo oculto de tu Drive.
import { FICHAS_BASE, BIBLIO_BASE } from './hexaflexBase.js';

const CLAVE = 'portland-lab-v1';
let estado = null;
let alGuardar = null;

function porDefecto() {
  return {
    version: 1,
    updatedAt: 0,
    ajustes: { nombre: '', carpetas: {} },
    hexaflex: { modelo: {}, procesos: {}, fichas: [], notas: {} },
    biblio: null,
    diario: [],
    apuntes: [],
    estrategias: [],
    portland: { notas: '' },
    borrados: [],
  };
}

export const nuevoId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));

// Seguridad: los datos pueden venir de Drive. Se descarta lo que no tenga la forma esperada.
const ID_OK = /^[\w.:-]{1,128}$/;
function sanearIds(o, prof = 0) {
  if (!o || typeof o !== 'object' || prof > 8) return;
  for (const k of Object.keys(o)) {
    const v = o[k];
    if ((k === 'id' || /Id$/.test(k)) && v != null && !(typeof v === 'string' && ID_OK.test(v)) && typeof v !== 'number') o[k] = null;
    else if (typeof v === 'object') sanearIds(v, prof + 1);
  }
}
const conId = (l) => (Array.isArray(l) ? l.filter((x) => x && typeof x === 'object' && x.id != null) : []);
function sanear(s) {
  if (!s || typeof s !== 'object' || Array.isArray(s)) return {};
  sanearIds(s);
  if (s.hexaflex) s.hexaflex.fichas = conId(s.hexaflex.fichas);
  if (s.biblio) s.biblio = conId(s.biblio);
  s.estrategias = conId(s.estrategias);
  s.apuntes = conId(s.apuntes).filter((a) => typeof a.archivoId === 'string');
  s.diario = conId(s.diario).filter((e) => typeof e.fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.fecha));
  return s;
}

function completar(s) {
  s = sanear(s);
  const d = porDefecto();
  s.ajustes = { ...d.ajustes, ...(s.ajustes || {}) };
  s.ajustes.carpetas = s.ajustes.carpetas || {};
  if (!Array.isArray(s.borrados)) s.borrados = [];
  if (!Array.isArray(s.diario)) s.diario = [];
  if (!Array.isArray(s.apuntes)) s.apuntes = [];
  for (const a of s.apuntes) { a.titulo = String(a.titulo || 'Sin título'); a.temas = Array.isArray(a.temas) ? a.temas : []; a.emoji = String(a.emoji || '').slice(0, 8); }
  for (const e of s.diario) { e.tipo = ['idea', 'reflexion', 'nota'].includes(e.tipo) ? e.tipo : 'reflexion'; e.procesos = Array.isArray(e.procesos) ? e.procesos : []; }
  s.portland = s.portland && typeof s.portland === 'object' ? s.portland : { notas: '' };
  delete s.grupos; delete s.grupoActivo;
  if (!s.hexaflex) s.hexaflex = d.hexaflex;
  const hx = s.hexaflex;
  hx.modelo = hx.modelo || {}; hx.procesos = hx.procesos || {}; hx.notas = hx.notas || {};
  if (!Array.isArray(hx.fichas)) hx.fichas = [];
  // Fichas de ejemplo (una por proceso), solo la primera vez
  if (!hx.base) {
    const ids = new Set(hx.fichas.map((f) => f.id)); const borr = new Set(s.borrados);
    for (const f of FICHAS_BASE) if (!ids.has(f.id) && !borr.has(f.id)) hx.fichas.push(JSON.parse(JSON.stringify(f)));
    hx.base = true;
  }
  for (const f of hx.fichas) { f.audios = f.audios || []; f.videos = f.videos || []; f.exp = f.exp || {}; f.notasExp = f.notasExp || []; f.procesos = Array.isArray(f.procesos) ? f.procesos : []; }
  if (!Array.isArray(s.biblio)) s.biblio = BIBLIO_BASE.map((b) => ({ ...b }));
  for (const b of s.biblio) {
    b.titulo = String(b.titulo || 'Sin título'); b.autor = String(b.autor || ''); b.tipo = b.tipo || 'Libro';
    b.estado = ['pendiente', 'curso', 'leido'].includes(b.estado) ? b.estado : 'pendiente';
    b.citas = conId(b.citas); b.procesos = Array.isArray(b.procesos) ? b.procesos : [];
    if (b.enlace && !/^https?:\/\/[^\s"'<>]+$/i.test(b.enlace)) b.enlace = '';
  }
  if (!Array.isArray(s.estrategias)) s.estrategias = [];
  for (const x of s.estrategias) {
    x.titulo = String(x.titulo || 'Estrategia'); x.procesos = Array.isArray(x.procesos) ? x.procesos : []; x.fichas = Array.isArray(x.fichas) ? x.fichas : [];
    x.pasos = conId(x.pasos); x.bloqueos = conId(x.bloqueos); x.ensayos = conId(x.ensayos);
    x.revision = x.revision && typeof x.revision === 'object' ? x.revision : {};
    x.minutos = Number(x.minutos) > 0 ? Number(x.minutos) : 15;
  }
  return s;
}

// Guardado en el dispositivo: IndexedDB (sin el límite de ~5 MB de localStorage), con localStorage como respaldo.
// Si algo falla, se avisa a la app para que lo muestre (nunca falla en silencio).
let alFallar = null; let fallo = false;
export function siFallaElGuardado(fn) { alFallar = fn; }
export const hayFallo = () => fallo;
function abrirDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('portland-lab', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('archivos');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function idbLeer() {
  const db = await abrirDB();
  return new Promise((res, rej) => { const q = db.transaction('archivos').objectStore('archivos').get(CLAVE); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
}
async function idbEscribir(v) {
  const db = await abrirDB();
  return new Promise((res, rej) => { const tx = db.transaction('archivos', 'readwrite'); tx.objectStore('archivos').put(v, CLAVE); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); });
}
let cola = Promise.resolve();
function persistir() {
  const texto = JSON.stringify(estado);
  let okLS = true;
  try { localStorage.setItem(CLAVE, texto); } catch { okLS = false; try { localStorage.removeItem(CLAVE); } catch {} }
  cola = cola.then(() => idbEscribir(texto)).then(
    () => { if (fallo) { fallo = false; alFallar?.(false); } },
    (e) => { console.warn('No se pudo guardar en el dispositivo', e); if (!okLS) { fallo = true; alFallar?.(true); } },
  );
  return cola;
}
const leerJSON = (t) => { try { return t ? JSON.parse(t) : null; } catch { return null; } };
export async function cargar() {
  let deIDB = null; let deLS = null;
  try { deIDB = leerJSON(await idbLeer()); } catch {}
  try { deLS = leerJSON(localStorage.getItem(CLAVE)); } catch {}
  // Se queda con la copia más reciente de las dos
  const elegido = [deIDB, deLS].filter(Boolean).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
  estado = completar(elegido || porDefecto());
  persistir();
  try { navigator.storage?.persist?.(); } catch {}
  return estado;
}
export const datos = () => estado;
export function guardar() {
  estado.updatedAt = Date.now();
  persistir();
  alGuardar?.(estado);
}
export function actualizar(fn) { fn(estado); guardar(); }
export function reemplazar(nuevo, { sincronizar = false } = {}) {
  estado = completar(nuevo);
  if (sincronizar) estado.updatedAt = Date.now();
  persistir();
  if (sincronizar) alGuardar?.(estado);
}
export function siempreAlGuardar(fn) { alGuardar = fn; }
export function olvidarTodo() { try { localStorage.removeItem(CLAVE); } catch {} estado = completar(porDefecto()); }
// Comprueba que un archivo de copia tiene pinta de ser de Flexeo
export const esCopiaValida = (o) => !!o && typeof o === 'object' && !Array.isArray(o) && ('hexaflex' in o || 'diario' in o || 'estrategias' in o);

// Junta dos copias (este dispositivo y Drive) sin perder nada de ninguna
export function fusionar(local, remoto) {
  const L = completar(JSON.parse(JSON.stringify(local)));
  const R = completar(JSON.parse(JSON.stringify(remoto)));
  const localMasNuevo = (L.updatedAt || 0) >= (R.updatedAt || 0);
  const borrados = new Set([...L.borrados, ...R.borrados]);
  const unir = (lr, ll) => {
    const m = new Map(lr.filter((x) => !borrados.has(x.id)).map((x) => [x.id, x]));
    for (const x of ll) if (!borrados.has(x.id) && (localMasNuevo || !m.has(x.id))) m.set(x.id, x);
    return [...m.values()];
  };
  const notas = { ...R.hexaflex.notas };
  for (const [k, v] of Object.entries(L.hexaflex.notas)) if (v && (localMasNuevo || !notas[k])) notas[k] = v;
  const base = localMasNuevo ? L : R; const otro = localMasNuevo ? R : L;
  const ajustes = { ...otro.ajustes, ...Object.fromEntries(Object.entries(base.ajustes).filter(([, v]) => v !== '' && v != null)) };
  ajustes.carpetas = { ...(otro.ajustes.carpetas || {}), ...(base.ajustes.carpetas || {}) };
  return {
    ...R, ...L,
    updatedAt: Date.now(),
    ajustes,
    hexaflex: { ...R.hexaflex, ...L.hexaflex, notas, fichas: unir(R.hexaflex.fichas, L.hexaflex.fichas) },
    biblio: unir(R.biblio, L.biblio),
    diario: unir(R.diario, L.diario),
    estrategias: unir(R.estrategias, L.estrategias),
    apuntes: unir(R.apuntes, L.apuntes),
    portland: { notas: base.portland?.notas || otro.portland?.notas || '' },
    borrados: [...borrados],
  };
}
