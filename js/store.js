// Datos de Portland Lab: diario, Hexaflex, bibliografía y notas del Grupo Portland.
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
    portland: { notas: '' },
    borrados: [],
  };
}

export const nuevoId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));

// Seguridad: los datos pueden venir de Drive o de Luria Lab. Se descarta lo que no tenga la forma esperada.
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
  for (const e of s.diario) { e.tipo = e.tipo === 'idea' ? 'idea' : 'reflexion'; e.procesos = Array.isArray(e.procesos) ? e.procesos : []; }
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
  return s;
}

export function cargar() {
  try { estado = JSON.parse(localStorage.getItem(CLAVE)); } catch { estado = null; }
  estado = completar(estado || porDefecto());
  try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch {}
  return estado;
}
export const datos = () => estado;
export function guardar() {
  estado.updatedAt = Date.now();
  try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch (e) { console.warn('No se pudo guardar en el dispositivo', e); }
  alGuardar?.(estado);
}
export function actualizar(fn) { fn(estado); guardar(); }
export function reemplazar(nuevo, { sincronizar = false } = {}) {
  estado = completar(nuevo);
  try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch {}
  if (sincronizar) alGuardar?.(estado);
}
export function siempreAlGuardar(fn) { alGuardar = fn; }
export function olvidarTodo() { try { localStorage.removeItem(CLAVE); } catch {} estado = completar(porDefecto()); }

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
    portland: { notas: base.portland?.notas || otro.portland?.notas || '' },
    borrados: [...borrados],
  };
}

// Trae las fichas, notas y libros del Hexaflex de Luria Lab (sin tocar Luria Lab).
// Devuelve cuántas fichas y libros nuevos se han añadido.
export function importarLuria(luria) {
  const L = sanear(JSON.parse(JSON.stringify(luria || {})));
  const hxL = L.hexaflex || {};
  let fichas = 0; let libros = 0;
  actualizar((s) => {
    const ids = new Set(s.hexaflex.fichas.map((f) => f.id));
    for (const f of conId(hxL.fichas)) {
      if (ids.has(f.id)) continue;
      // Los audios se quedan en Luria Lab (están en su dispositivo y su carpeta); los vídeos de Drive sí se enlazan
      s.hexaflex.fichas.push({ ...f, audios: [], videos: f.videos || [], exp: f.exp || {}, notasExp: f.notasExp || [], procesos: f.procesos || [], deLuria: true });
      fichas++;
    }
    for (const [k, v] of Object.entries(hxL.notas || {})) if (v && !s.hexaflex.notas[k]) s.hexaflex.notas[k] = v;
    const libs = new Set(s.biblio.map((b) => b.id));
    for (const b of conId(L.biblio)) if (!libs.has(b.id)) { s.biblio.push(b); libros++; }
  });
  return { fichas, libros };
}
