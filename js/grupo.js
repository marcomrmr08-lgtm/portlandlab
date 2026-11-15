// Hoja común del Grupo Portland: la crea el host en su Drive y la comparte con los invitados.
// Cada pestaña es una tabla con cabecera. Nunca se borran filas (se marcan con «borrado»),
// así el número de fila no cambia aunque varias personas escriban a la vez.
// Sin Google configurado (modo prueba) la «hoja» se guarda solo en este dispositivo.
import * as G from './google.js';
import { CONFIG } from './config.js';

export const TABLAS = {
  Grupo: ['clave', 'valor'],
  Sesiones: ['id', 'titulo', 'fecha', 'hora', 'lugar', 'procesos', 'plazasTerapeuta', 'plazasPaciente', 'apertura', 'cierre', 'notas', 'minIntervencion', 'minPaciente', 'minGrupo', 'minApertura', 'minCierre', 'estado', 'actualizado', 'borrado'],
  Inscripciones: ['id', 'sesionId', 'email', 'nombre', 'rol', 'creado', 'borrado'],
  Rondas: ['id', 'sesionId', 'orden', 'terapeutaEmail', 'terapeutaNombre', 'pacienteEmail', 'pacienteNombre', 'proceso', 'tecnica', 'estado', 'actualizado', 'borrado'],
  Feedback: ['id', 'sesionId', 'rondaId', 'email', 'nombre', 'rol', 'sentir', 'conexion', 'procesos', 'diferente', 'creado', 'borrado'],
};
const PESTANAS = Object.keys(TABLAS);
export const ROLES = {
  terapeuta: { nombre: 'Terapeuta', plural: 'Terapeutas', texto: 'Practicas la intervención en el role play.' },
  paciente: { nombre: 'Paciente', plural: 'Pacientes', texto: 'Haces de paciente con un caso inventado o un «real play» ligero.' },
  publico: { nombre: 'Público', plural: 'Público', texto: 'Observas y das feedback al grupo.' },
};
export const MINUTOS = { minApertura: 10, minIntervencion: 15, minPaciente: 5, minGrupo: 10, minCierre: 10 };

// ---------- Dos formas de guardar: Google Sheets o este dispositivo (modo prueba) ----------
const CLAVE_DEMO = 'pl-demo-hojas';
const demo = {
  _todo() { try { return JSON.parse(localStorage.getItem(CLAVE_DEMO)) || {}; } catch { return {}; } },
  _poner(t) { try { localStorage.setItem(CLAVE_DEMO, JSON.stringify(t)); } catch {} },
  async crearHoja(nombre, _padre, pestanas) { const t = this._todo(); const id = 'demo-' + Math.random().toString(36).slice(2, 10); t[id] = Object.fromEntries(pestanas.map((p) => [p, []])); this._poner(t); return id; },
  async titulosPestanas(id) { const h = this._todo()[id]; if (!h) throw new Error('No se encuentra la hoja del grupo en este dispositivo.'); return Object.keys(h); },
  async anadirPestanas(id, ps) { const t = this._todo(); for (const p of ps) t[id][p] = t[id][p] || []; this._poner(t); },
  async leerRangos(id, ps) { const h = this._todo()[id]; if (!h) throw new Error('No se encuentra la hoja del grupo en este dispositivo.'); return Object.fromEntries(ps.map((p) => [p, JSON.parse(JSON.stringify(h[p] || []))])); },
  async anadirFilas(id, p, filas) { const t = this._todo(); t[id][p].push(...filas.map((f) => f.map(String))); this._poner(t); },
  async escribirFilas(id, cambios) { const t = this._todo(); for (const c of cambios) t[id][c.pestana][c.fila - 1] = c.valores.map(String); this._poner(t); },
  // En modo prueba se puede ver la app «como invitado» para comprobar qué ven los demás
  async quienSoy() { let inv = false; try { inv = localStorage.getItem('pl-demo-invitado') === '1'; } catch {} return inv ? { nombre: 'Invitada de prueba', email: 'invitada@modo-prueba' } : { nombre: '', email: 'tu@modo-prueba' }; },
};
const almacen = () => (G.configurado() ? G : demo);
export const modoPrueba = () => !G.configurado();
export const quienSoy = () => almacen().quienSoy();

// ---------- Lectura ----------
const cabeceras = {}; // por hoja: { Pestaña: ['id', …] }
const ID_OK = /^[\w.:-]{1,128}$/;
const EMAIL_OK = /^[^\s@<>"']{1,100}@[^\s@<>"']{1,100}$/;
const FECHA_OK = /^\d{4}-\d{2}-\d{2}$/;
const HORA_OK = /^\d{2}:\d{2}$/;

function aObjetos(filas, cab) {
  const out = [];
  for (let i = 1; i < filas.length; i++) {
    const o = { _fila: i + 1 };
    cab.forEach((k, j) => { o[k] = (filas[i][j] ?? '').toString(); });
    out.push(o);
  }
  return out;
}
// Seguridad: la hoja la puede editar cualquier invitado. Lo que no tenga la forma esperada se descarta.
function sanear(t) {
  const vivo = (o) => o.borrado !== '1' && ID_OK.test(o.id || '');
  t.sesiones = t.sesiones.filter(vivo).map((s) => ({ ...s, fecha: FECHA_OK.test(s.fecha) ? s.fecha : '', hora: HORA_OK.test(s.hora) ? s.hora : '' }));
  t.inscripciones = t.inscripciones.filter((x) => vivo(x) && EMAIL_OK.test(x.email) && ROLES[x.rol]).map((x) => ({ ...x, email: x.email.toLowerCase() }));
  t.rondas = t.rondas.filter(vivo).map((r) => ({ ...r, orden: Number(r.orden) || 0 })).sort((a, b) => a.orden - b.orden);
  t.feedback = t.feedback.filter((f) => vivo(f) && (f.rol === 'paciente' || f.rol === 'publico'));
  return t;
}

// Lee toda la hoja. Si falta alguna pestaña o columna (versiones anteriores), la añade.
export async function leer(id) {
  if (!ID_OK.test(id || '')) throw new Error('El enlace del grupo no es válido.');
  const A = almacen();
  const titulos = await A.titulosPestanas(id);
  const faltan = PESTANAS.filter((p) => !titulos.includes(p));
  if (faltan.length) await A.anadirPestanas(id, faltan);
  const datos = await A.leerRangos(id, PESTANAS);
  const cab = {}; const arreglos = [];
  for (const p of PESTANAS) {
    const actual = (datos[p][0] || []).map(String);
    const completa = [...actual, ...TABLAS[p].filter((k) => !actual.includes(k))];
    if (completa.length !== actual.length) arreglos.push({ pestana: p, fila: 1, valores: completa });
    cab[p] = completa;
    if (!datos[p].length) datos[p] = [completa];
  }
  if (arreglos.length) await A.escribirFilas(id, arreglos);
  cabeceras[id] = cab;
  const g = Object.fromEntries(aObjetos(datos.Grupo, cab.Grupo).map((o) => [o.clave, o.valor]));
  return sanear({
    id,
    grupo: { nombre: g.nombre || 'Grupo Portland', hostEmail: (g.hostEmail || '').toLowerCase(), hostNombre: g.hostNombre || '', creado: g.creado || '' },
    sesiones: aObjetos(datos.Sesiones, cab.Sesiones),
    inscripciones: aObjetos(datos.Inscripciones, cab.Inscripciones),
    rondas: aObjetos(datos.Rondas, cab.Rondas),
    feedback: aObjetos(datos.Feedback, cab.Feedback),
    leido: Date.now(),
  });
}

// ---------- Escritura ----------
const nuevoId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
const ahora = () => new Date().toISOString();
const limpiar = (v) => String(v ?? '').slice(0, 5000);
function fila(id, pestana, obj) {
  const cab = cabeceras[id]?.[pestana] || TABLAS[pestana];
  return cab.map((k) => limpiar(obj[k]));
}

export async function crearGrupo(nombre, yo, carpetas) {
  const A = almacen();
  const padre = G.configurado() ? await G.carpeta([CONFIG.CARPETA_RAIZ], carpetas) : null;
  const id = await A.crearHoja(`Grupo Portland · ${nombre}`, padre, PESTANAS);
  await A.escribirFilas(id, PESTANAS.map((p) => ({ pestana: p, fila: 1, valores: TABLAS[p] })));
  await A.anadirFilas(id, 'Grupo', [['nombre', limpiar(nombre)], ['hostEmail', yo.email], ['hostNombre', limpiar(yo.nombre)], ['creado', ahora()], ['version', '1']]);
  return id;
}

export async function anadir(id, pestana, obj) {
  const o = { id: nuevoId(), ...obj };
  await almacen().anadirFilas(id, pestana, [fila(id, pestana, o)]);
  return o;
}
export async function cambiar(id, pestana, obj) {
  if (!obj._fila) throw new Error('Falta la fila que hay que cambiar.');
  await almacen().escribirFilas(id, [{ pestana, fila: obj._fila, valores: fila(id, pestana, obj) }]);
}
export async function cambiarVarios(id, cambios) {
  await almacen().escribirFilas(id, cambios.map(({ pestana, obj }) => ({ pestana, fila: obj._fila, valores: fila(id, pestana, obj) })));
}
export const borrar = (id, pestana, obj) => cambiar(id, pestana, { ...obj, borrado: '1' });

// Sesión
export function guardarSesion(id, sesion) {
  const o = { ...sesion, actualizado: ahora() };
  return o._fila ? cambiar(id, 'Sesiones', o).then(() => o) : anadir(id, 'Sesiones', { estado: 'programada', ...o });
}

// Inscripción: una por persona y sesión (si ya estaba, se cambia el rol)
export async function apuntarse(id, t, sesion, yo, rol) {
  const ya = t.inscripciones.find((x) => x.sesionId === sesion.id && x.email === yo.email);
  const max = rol === 'terapeuta' ? Number(sesion.plazasTerapeuta) : rol === 'paciente' ? Number(sesion.plazasPaciente) : Infinity;
  const ocupadas = t.inscripciones.filter((x) => x.sesionId === sesion.id && x.rol === rol && x.email !== yo.email).length;
  if (max && ocupadas >= max) throw new Error(`Ya no quedan plazas de ${ROLES[rol].nombre.toLowerCase()}. Puedes apuntarte como público.`);
  if (ya) { await cambiar(id, 'Inscripciones', { ...ya, rol, nombre: yo.nombre }); return; }
  await anadir(id, 'Inscripciones', { sesionId: sesion.id, email: yo.email, nombre: yo.nombre, rol, creado: ahora() });
}

// Rondas: se guardan todas de una vez (las que sobran se marcan como borradas)
export async function guardarRondas(id, t, sesionId, lista) {
  const antes = t.rondas.filter((r) => r.sesionId === sesionId);
  const cambios = []; const nuevas = [];
  lista.forEach((r, i) => {
    const o = { ...r, sesionId, orden: String(i + 1), actualizado: ahora(), estado: r.estado || 'pendiente' };
    if (o._fila) cambios.push({ pestana: 'Rondas', obj: o }); else nuevas.push(fila(id, 'Rondas', { id: nuevoId(), ...o }));
  });
  for (const r of antes) if (!lista.some((x) => x.id === r.id)) cambios.push({ pestana: 'Rondas', obj: { ...r, borrado: '1' } });
  if (cambios.length) await cambiarVarios(id, cambios);
  if (nuevas.length) await almacen().anadirFilas(id, 'Rondas', nuevas);
}
export const estadoRonda = (id, ronda, estado) => cambiar(id, 'Rondas', { ...ronda, estado, actualizado: ahora() });

// Feedback: uno por persona y ronda (si ya había, se sustituye)
export async function darFeedback(id, t, ronda, yo, datos) {
  const ya = t.feedback.find((f) => f.rondaId === ronda.id && f.email === yo.email);
  const o = { sesionId: ronda.sesionId, rondaId: ronda.id, email: yo.email, nombre: yo.nombre, creado: ahora(), ...datos };
  if (ya) await cambiar(id, 'Feedback', { ...ya, ...o }); else await anadir(id, 'Feedback', o);
}

// Enlace de invitación: abre la app y se une al grupo
export const enlaceInvitacion = (id) => `${CONFIG.URL_APP}#/unirse/${encodeURIComponent(id)}`;
