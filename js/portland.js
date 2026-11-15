// Grupo Portland: sesiones y calendario, inscripción y roles, rondas con temporizador y feedback guiado.
// Los datos del grupo viven en la hoja común (grupo.js). Aquí solo se guarda en local qué grupos sigues.
import * as S from './store.js';
import * as G from './google.js';
import * as GR from './grupo.js';
import { PROCESOS, PILAR, proceso } from './procesos.js';
import { esc, hoyISO, sumarDias, aFecha, fmtFecha, fmtCorta, toast, abrirModal, cerrarModal, conCarga, descargar, icon } from './ui.js';
import { ctx, app, irA, nav, volver, seg, leerForm, confirmar, copiar, vNoEncontrado as noEncontrado } from './comun.js';

const vNoEncontrado = () => noEncontrado('#/grupo');
const { ROLES, MINUTOS } = GR;

// ======================= Estado del grupo cargado =======================
let T = null;          // datos de la hoja del grupo activo
let YO = null;         // { email, nombre } de quien usa la app
let cargando = null;   // promesa de la carga en curso
let errorCarga = '';

export const grupoActivo = () => S.datos().grupos.find((x) => x.id === S.datos().grupoActivo) || null;
const necesitaConexion = () => G.configurado() && !G.conectado();
export const olvidarCarga = () => { T = null; errorCarga = ''; };

async function identidad() {
  const q = await GR.quienSoy();
  // En modo prueba, «ver como invitada» usa el nombre de la invitada de prueba
  const propio = GR.modoPrueba() && q.email.startsWith('invitada') ? '' : S.datos().ajustes.nombre;
  const nombre = (propio || q.nombre || q.email.split('@')[0] || '').trim();
  YO = { email: q.email.toLowerCase(), nombre };
  return YO;
}
export async function recargar() {
  const g = grupoActivo(); if (!g) return;
  await identidad();
  T = await GR.leer(g.id);
  errorCarga = '';
  // Se actualiza el nombre guardado y si eres el host (sin guardar si no cambia nada)
  const host = YO.email === T.grupo.hostEmail;
  if (g.nombre !== T.grupo.nombre || g.host !== host) S.actualizar(() => { g.nombre = T.grupo.nombre; g.host = host; });
}
function pedirCarga() {
  if (cargando) return;
  cargando = recargar().catch((e) => { errorCarga = e.message || String(e); console.warn(e); })
    .finally(() => { cargando = null; ctx.render(); });
}
// Devuelve la pantalla de espera si los datos del grupo aún no están; null si ya están
function esperar(titulo = 'Grupo') {
  const g = grupoActivo();
  if (T && T.id === g?.id) return null;
  if (necesitaConexion()) return pantallaConectar(titulo);
  if (errorCarga) return { html: `<div class="pantalla">${cabeceraGrupo(titulo)}<div class="tarjeta"><b>No se pudo abrir el grupo</b><p class="pequeno suave" style="line-height:1.5">${esc(errorCarga)}</p><button class="btn primario" data-act="pl-reintentar">${icon('refrescar', 18)}Reintentar</button></div></div>${nav('grupo')}` };
  pedirCarga();
  return { html: `<div class="pantalla">${cabeceraGrupo(titulo)}<div class="tarjeta" style="align-items:center;padding:36px 16px"><span class="spinner" aria-hidden="true"></span><span class="suave pequeno">Abriendo la hoja del grupo…</span></div></div>${nav('grupo')}` };
}
function pantallaConectar(titulo) {
  return { html: `<div class="pantalla">${cabeceraGrupo(titulo)}
    <div class="tarjeta"><span class="icono-caja bg-primario">${icon('hoja', 22)}</span><b style="font-size:17px">Conecta con Google para ver el grupo</b>
    <p class="pequeno suave" style="line-height:1.5">Las sesiones, inscripciones y el feedback están en la hoja común del grupo, en Google Drive.</p>
    <button class="btn primario grande" data-act="pl-conectar">Conectar con Google</button></div></div>${nav('grupo')}` };
}
const cabeceraGrupo = (titulo) => `<div class="item-texto"><span class="marca">Portland Lab</span><h1 class="titulo">${esc(titulo)}</h1></div>`;

// ======================= Utilidades =======================
const esHost = () => Boolean(YO && T && YO.email === T.grupo.hostEmail);
const sesion = (id) => T.sesiones.find((s) => s.id === id);
const inscritos = (sid) => T.inscripciones.filter((x) => x.sesionId === sid);
const deRol = (sid, rol) => inscritos(sid).filter((x) => x.rol === rol);
const miInscripcion = (sid) => inscritos(sid).find((x) => x.email === YO.email);
const rondasDe = (sid) => T.rondas.filter((r) => r.sesionId === sid).sort((a, b) => a.orden - b.orden);
const feedbackDe = (rid) => T.feedback.filter((f) => f.rondaId === rid);
const minutos = (s, k) => Number(s[k]) > 0 ? Number(s[k]) : MINUTOS[k];
const porRonda = (s) => minutos(s, 'minIntervencion') + minutos(s, 'minPaciente') + minutos(s, 'minGrupo');
const procesosDe = (s) => (s.procesos || '').split(',').map((x) => x.trim()).filter((k) => proceso(k));
const plazas = (s, rol) => (rol === 'publico' ? 0 : Number(rol === 'terapeuta' ? s.plazasTerapeuta : s.plazasPaciente) || 0);
function fmtDur(min) { const h = Math.floor(min / 60); const m = min % 60; return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`; }
function duracion(s, n) { return minutos(s, 'minApertura') + n * porRonda(s) + minutos(s, 'minCierre'); }
// Rondas previstas: las organizadas o, si aún no hay, tantas como terapeutas apuntados (o plazas)
const nRondas = (s) => rondasDe(s.id).length || deRol(s.id, 'terapeuta').length || plazas(s, 'terapeuta');
const pasada = (s) => s.estado === 'hecha' || (s.fecha && s.fecha < hoyISO());
const ordenSes = (a, b) => (a.fecha + (a.hora || '99')).localeCompare(b.fecha + (b.hora || '99'));
const nombreDe = (email) => T.inscripciones.find((x) => x.email === email)?.nombre || (email ? email.split('@')[0] : '');
// Se puede dar feedback cuando la ronda ha empezado o, si el host no usa el temporizador, desde el día de la sesión
const abiertaFeedback = (s, r) => r.estado !== 'pendiente' || Boolean(s.fecha && s.fecha <= hoyISO());
const pildoraRol = (rol) => `<span class="insignia rol-${rol}">${esc(ROLES[rol]?.nombre || rol)}</span>`;
const chipProcesos = (ks) => ks.map((k) => `<span class="insignia pilar-${PILAR[k]}">${esc(proceso(k).nombre)}</span>`).join('');
function haceCuanto(ts) { const s = Math.round((Date.now() - ts) / 1000); return s < 60 ? 'ahora mismo' : `hace ${Math.round(s / 60)} min`; }
const fechaBloque = (s) => {
  if (!s.fecha) return '<span class="fecha-bloque"><b>?</b><span>sin fecha</span></span>';
  const d = aFecha(s.fecha);
  return `<span class="fecha-bloque"><b>${d.getDate()}</b><span>${esc(new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(d).replace('.', ''))}</span></span>`;
};

// ======================= Inicio del grupo =======================
export function vGrupo() {
  const s = S.datos();
  if (!s.grupos.length) return vSinGrupo();
  const g = grupoActivo();
  const espera = esperar(g?.nombre || 'Grupo'); if (espera) return espera;
  const host = esHost();
  const futuras = T.sesiones.filter((x) => !pasada(x) && x.estado !== 'cancelada').sort(ordenSes);
  const pasadas = T.sesiones.filter((x) => pasada(x) || x.estado === 'cancelada').sort(ordenSes).reverse();
  const prox = futuras[0];
  return {
    html: `<div class="pantalla">
    <div class="fila-entre" style="align-items:flex-start"><div class="item-texto"><span class="marca">${host ? 'Eres el host' : `Host: ${esc(T.grupo.hostNombre || T.grupo.hostEmail)}`}</span><h1 class="titulo">${esc(T.grupo.nombre)}</h1></div>
      <button class="icono-btn" data-act="pl-actualizar" aria-label="Actualizar">${icon('refrescar', 20)}</button></div>
    ${s.grupos.length > 1 ? `<div class="chips" role="group" aria-label="Tus grupos">${s.grupos.map((x) => `<button class="chip ${x.id === g.id ? 'activo' : ''}" data-act="pl-cambiar-grupo" data-id="${esc(x.id)}">${esc(x.nombre || 'Grupo')}</button>`).join('')}</div>` : ''}
    ${GR.modoPrueba() ? `<div class="aviso-caja">${icon('candado', 18)}<span><b>Modo prueba.</b> El grupo se guarda solo en este dispositivo${YO.email.startsWith('invitada') ? '. Estás viendo la app <b>como invitada</b> (cámbialo en Ajustes).' : '.'}</span></div>` : ''}
    ${prox ? `<h2 class="etiqueta-grupo">Próxima sesión</h2>${tarjetaProxima(prox)}` : `<div class="tarjeta" style="align-items:center;text-align:center;padding:28px 18px">${icon('calendario', 28)}<b>No hay sesiones programadas</b><p class="pequeno suave">${host ? 'Crea la primera sesión del grupo.' : 'Cuando el host programe una sesión, aparecerá aquí.'}</p>${host ? `<a href="#/grupo/s/nueva/editar" class="btn primario">${icon('mas', 18)}Nueva sesión</a>` : ''}</div>`}
    ${futuras.length > 1 ? `<h2 class="etiqueta-grupo">Más adelante</h2><div class="seccion">${futuras.slice(1).map(filaSesion).join('')}</div>` : ''}
    ${host ? `<div class="botones">${prox ? `<a href="#/grupo/s/nueva/editar" class="btn">${icon('mas', 18)}Nueva sesión</a>` : ''}<button class="btn" data-act="pl-invitar">${icon('enlace', 18)}Invitar</button></div>` : ''}
    ${pasadas.length ? `<h2 class="etiqueta-grupo">Sesiones anteriores</h2><div class="seccion">${pasadas.map(filaSesion).join('')}</div>` : ''}
    <p class="mini suave" style="text-align:center">Actualizado ${haceCuanto(T.leido)}</p>
    </div>${nav('grupo')}`,
  };
}

function tarjetaProxima(s) {
  const mia = miInscripcion(s.id); const n = nRondas(s);
  const cupo = (rol) => `<div class="cupo"><span class="mini suave">${ROLES[rol].plural}</span><b>${deRol(s.id, rol).length}${plazas(s, rol) ? `<span class="suave"> / ${plazas(s, rol)}</span>` : ''}</b></div>`;
  return `<a href="#/grupo/s/${encodeURIComponent(s.id)}" class="tarjeta destacada sesion-prox">
    <div class="fila-entre" style="align-items:flex-start">${fechaBloque(s)}<div class="item-texto"><span class="pequeno" style="font-weight:700;color:var(--verde)">${esc(fmtFecha(s.fecha))}${s.hora ? ` · ${esc(s.hora)}` : ''}</span><span style="font-size:19px;font-weight:800;line-height:1.25">${esc(s.titulo || 'Sesión del grupo')}</span>${s.lugar ? `<span class="item-sub">${esc(s.lugar)}</span>` : ''}</div></div>
    ${procesosDe(s).length ? `<span class="insignias">${chipProcesos(procesosDe(s))}</span>` : ''}
    <div class="cupos">${cupo('terapeuta')}${cupo('paciente')}${cupo('publico')}</div>
    <div class="fila-entre"><span class="pequeno suave">${n ? `${n} ronda${n === 1 ? '' : 's'} · ${fmtDur(duracion(s, n))}` : 'Sin rondas todavía'}</span>${mia ? `<span class="insignias"><span class="mini suave">Vas como</span>${pildoraRol(mia.rol)}</span>` : '<span class="insignia aviso">Apúntate</span>'}</div>
  </a>`;
}
function filaSesion(s) {
  const mia = miInscripcion(s.id);
  return `<a href="#/grupo/s/${encodeURIComponent(s.id)}" class="item">${fechaBloque(s)}<span class="item-texto"><span class="item-titulo">${esc(s.titulo || 'Sesión del grupo')}</span><span class="item-sub">${esc(fmtFecha(s.fecha, { weekday: 'long' }))}${s.hora ? ` · ${esc(s.hora)}` : ''}${s.estado === 'cancelada' ? ' · Cancelada' : ''}</span></span>${mia ? pildoraRol(mia.rol) : ''}</a>`;
}

function vSinGrupo() {
  return {
    html: `<div class="pantalla">${cabeceraGrupo('Grupo Portland')}
    <section class="tarjeta">
      <p class="texto-largo" style="color:var(--gris)">Un espacio de práctica experiencial de ACT entre compañeros: una apertura con atención plena, rondas de role play en parejas y feedback del paciente y del grupo.</p>
      <ul class="lista-pasos">
        <li>${icon('calendario', 18)}<span><b>Sesiones</b>: fecha, lugar, procesos que se trabajan y guion.</span></li>
        <li>${icon('persona', 18)}<span><b>Inscripción</b> como terapeuta, paciente o público, con plazas.</span></li>
        <li>${icon('reloj', 18)}<span><b>Rondas con temporizador</b> que guía el host en la sala.</span></li>
        <li>${icon('bocadillo', 18)}<span><b>Feedback guiado</b> del paciente y del público, guardado por ronda.</span></li>
      </ul>
    </section>
    <button class="btn primario grande" data-act="pl-crear">${icon('mas', 20)}Crear un grupo (soy el host)</button>
    <button class="btn grande" data-act="pl-unirse-modal">${icon('enlace', 20)}Tengo un enlace de invitación</button>
    <p class="mini suave" style="line-height:1.5;text-align:center">El grupo es una hoja de Google en el Drive del host, compartida con los invitados.</p>
    </div>${nav('grupo')}`,
  };
}

// ======================= Sesión =======================
let vigilante = null; // actualización automática mientras se ve una sesión
function vigilar(sid) {
  clearInterval(vigilante);
  vigilante = setInterval(async () => {
    if (!location.hash.startsWith(`#/grupo/s/${encodeURIComponent(sid)}`) || location.hash.includes('/editar') || location.hash.includes('/rondas') || location.hash.includes('/directo')) { clearInterval(vigilante); return; }
    if (document.hidden || document.getElementById('modal')?.open || cargando || !T) return;
    const antes = JSON.stringify([T.inscripciones, T.rondas, T.feedback, T.sesiones]);
    try { await recargar(); } catch { return; }
    if (antes !== JSON.stringify([T.inscripciones, T.rondas, T.feedback, T.sesiones])) ctx.render();
  }, 25000);
}

export function vSesion(id) {
  const espera = esperar('Sesión'); if (espera) return espera;
  const s = sesion(id); if (!s) return vNoEncontrado();
  const host = esHost(); const mia = miInscripcion(s.id); const rondas = rondasDe(s.id); const n = nRondas(s);
  const lista = (rol) => {
    const xs = deRol(s.id, rol); const max = rol === 'publico' ? 0 : plazas(s, rol);
    return `<div class="rol-bloque"><div class="fila-entre"><span style="font-weight:700">${ROLES[rol].plural}</span><span class="pequeno ${max && xs.length >= max ? 'c-ambar' : 'suave'}" style="font-weight:700">${xs.length}${max ? ` / ${max}` : ''}${max && xs.length >= max ? ' · completo' : ''}</span></div>
      <div class="insignias">${xs.map((x) => `<span class="persona ${x.email === YO.email ? 'yo' : ''}">${esc(x.nombre || x.email)}</span>`).join('') || '<span class="mini suave">Nadie todavía</span>'}</div></div>`;
  };
  const enCurso = rondas.find((r) => r.estado === 'en_curso');
  const cancelada = s.estado === 'cancelada';
  vigilar(s.id);
  return {
    html: `<div class="pantalla sin-nav">${volver('#/grupo', 'Sesión', `<button class="icono-btn" data-act="pl-actualizar" aria-label="Actualizar">${icon('refrescar', 20)}</button>`)}
    <div class="item-texto"><span class="tipo" style="color:var(--verde)">${esc(fmtFecha(s.fecha))}${s.hora ? ` · ${esc(s.hora)}` : ''}</span><h1 class="titulo">${esc(s.titulo || 'Sesión del grupo')}</h1>
      ${s.lugar ? `<span class="suave pequeno" style="display:flex;gap:6px;align-items:center">${icon('lugar', 16)}${esc(s.lugar)}</span>` : ''}</div>
    ${cancelada ? '<div class="aviso-caja"><span><b>Sesión cancelada.</b></span></div>' : ''}
    ${procesosDe(s).length ? `<span class="insignias">${chipProcesos(procesosDe(s))}</span>` : ''}
    ${enCurso ? `<div class="aviso-caja en-directo"><i aria-hidden="true"></i><span><b>Ahora: ronda ${enCurso.orden}</b> · ${esc(enCurso.terapeutaNombre || nombreDe(enCurso.terapeutaEmail) || '¿?')} con ${esc(enCurso.pacienteNombre || nombreDe(enCurso.pacienteEmail) || '¿?')}</span></div>` : ''}

    ${!cancelada ? `<section class="tarjeta">
      <div class="fila-entre"><b style="font-size:17px">Tu participación</b>${mia ? pildoraRol(mia.rol) : ''}</div>
      ${mia ? `<p class="pequeno suave" style="line-height:1.45">${esc(ROLES[mia.rol].texto)}</p>` : '<p class="pequeno suave">Elige cómo quieres participar.</p>'}
      <div class="roles-elegir">${Object.entries(ROLES).map(([k, r]) => {
        const max = k === 'publico' ? 0 : plazas(s, k); const lleno = max && deRol(s.id, k).filter((x) => x.email !== YO.email).length >= max;
        return `<button class="rol-btn ${mia?.rol === k ? 'activo' : ''}" data-act="pl-apuntarse" data-s="${esc(s.id)}" data-rol="${k}" ${lleno && mia?.rol !== k ? 'disabled' : ''} aria-pressed="${mia?.rol === k}"><b>${r.nombre}</b><span class="mini">${lleno && mia?.rol !== k ? 'Completo' : max ? `${max - deRol(s.id, k).filter((x) => x.email !== YO.email).length} plaza${max - deRol(s.id, k).filter((x) => x.email !== YO.email).length === 1 ? '' : 's'}` : 'Libre'}</span></button>`;
      }).join('')}</div>
      ${mia ? `<button class="btn texto pequeno" data-act="pl-desapuntarse" data-s="${esc(s.id)}" style="align-self:flex-start">Borrarme de esta sesión</button>` : ''}
    </section>` : ''}

    <section class="tarjeta"><b style="font-size:17px">Quién viene</b>${lista('terapeuta')}${lista('paciente')}${lista('publico')}</section>

    <h2 class="etiqueta-grupo">Cómo será</h2>
    <section class="tarjeta lista">
      ${pasoGuion('Apertura', minutos(s, 'minApertura'), s.apertura || 'Meditación guiada para llegar y poner el tono.')}
      <div class="guion-paso rondas"><div class="guion-t"><b>Rondas en parejas</b><span class="mini suave">${porRonda(s)} min cada una</span></div>
        <div class="guion-sub"><span><b>${minutos(s, 'minIntervencion')} min</b> · Intervención</span><span><b>${minutos(s, 'minPaciente')} min</b> · Feedback del paciente</span><span><b>${minutos(s, 'minGrupo')} min</b> · Feedback del grupo</span></div></div>
      ${pasoGuion('Cierre', minutos(s, 'minCierre'), s.cierre || 'Cierre del grupo.')}
      <div class="fila"><span class="pequeno suave">${n ? `${n} ronda${n === 1 ? '' : 's'}` : 'Rondas por decidir'}</span><b class="pequeno">${n ? `Unas ${fmtDur(duracion(s, n))}` : ''}</b></div>
    </section>
    ${s.notas ? `<section class="tarjeta"><span class="tipo c-morado">Notas del host</span><p class="texto-largo">${esc(s.notas)}</p></section>` : ''}

    <div class="fila-entre"><h2 class="etiqueta-grupo" style="margin:8px 0 -2px 2px">Rondas</h2>${host ? `<a href="#/grupo/s/${encodeURIComponent(s.id)}/rondas" class="btn texto">${icon('editar', 16)}Organizar</a>` : ''}</div>
    <div class="seccion">${rondas.map((r) => tarjetaRonda(s, r)).join('') || `<p class="vacio">${host ? 'Organiza las parejas cuando tengas a la gente apuntada.' : 'El host organizará las parejas antes de la sesión.'}</p>`}</div>

    ${host && !cancelada ? `<a href="#/grupo/s/${encodeURIComponent(s.id)}/directo" class="btn primario grande">${icon('play', 18)}${rondas.some((r) => r.estado !== 'pendiente') ? 'Volver al temporizador' : 'Empezar la sesión'}</a>` : ''}
    <div class="botones"><button class="btn" data-act="pl-ics" data-s="${esc(s.id)}">${icon('calendario', 18)}A mi calendario</button>${host ? `<a href="#/grupo/s/${encodeURIComponent(s.id)}/editar" class="btn">${icon('editar', 18)}Editar sesión</a>` : `<button class="btn" data-act="pl-copiar-sesion" data-s="${esc(s.id)}">${icon('copiar', 18)}Copiar resumen</button>`}</div>
    </div>`,
  };
}
const pasoGuion = (t, min, txt) => `<div class="guion-paso"><div class="guion-t"><b>${esc(t)}</b><span class="mini suave">${min} min</span></div><p class="pequeno suave" style="line-height:1.45">${esc(txt)}</p></div>`;

function tarjetaRonda(s, r) {
  const fb = feedbackDe(r.id); const yoTer = r.terapeutaEmail === YO.email; const yoPac = r.pacienteEmail === YO.email;
  const mio = fb.find((f) => f.email === YO.email);
  const estado = { pendiente: '', en_curso: '<span class="insignia en-curso">En curso</span>', hecha: '<span class="insignia ok">Hecha</span>' }[r.estado] || '';
  const p = proceso(r.proceso);
  return `<section class="tarjeta ronda ${r.estado === 'en_curso' ? 'destacada' : ''}">
    <div class="fila-entre"><span class="tipo suave">Ronda ${r.orden}${p ? ` · <span class="pilar-txt-${PILAR[r.proceso]}">${esc(p.nombre)}</span>` : ''}</span>${estado}</div>
    <div class="pareja-fila"><span><span class="mini suave">Terapeuta</span><b class="${yoTer ? 'c-verde' : ''}">${esc(r.terapeutaNombre || nombreDe(r.terapeutaEmail) || 'Por decidir')}${yoTer ? ' (tú)' : ''}</b></span>
      <span class="pareja-sep" aria-hidden="true">${icon('sig', 16)}</span>
      <span><span class="mini suave">Paciente</span><b class="${yoPac ? 'c-verde' : ''}">${esc(r.pacienteNombre || nombreDe(r.pacienteEmail) || 'Por decidir')}${yoPac ? ' (tú)' : ''}</b></span></div>
    ${r.tecnica ? `<span class="pequeno"><span class="suave">Técnica:</span> <b>${esc(r.tecnica)}</b></span>` : ''}
    <div class="fila-entre"><a href="#/grupo/s/${encodeURIComponent(s.id)}/r/${encodeURIComponent(r.id)}" class="pequeno" style="font-weight:700">${icon('bocadillo', 16)} ${fb.length} feedback${fb.length === 1 ? '' : 's'}</a>
      ${!yoTer && abiertaFeedback(s, r) ? `<button class="btn pequeno ${mio ? '' : 'primario'}" data-act="pl-feedback" data-r="${esc(r.id)}">${mio ? 'Editar mi feedback' : 'Dar feedback'}</button>` : ''}
      ${yoTer && fb.length ? `<a href="#/grupo/s/${encodeURIComponent(s.id)}/r/${encodeURIComponent(r.id)}" class="btn pequeno primario">Ver feedback</a>` : ''}</div>
  </section>`;
}

// ======================= Crear / editar sesión (host) =======================
function proximoViernes() { let d = hoyISO(); for (let i = 1; i <= 7; i++) { const x = sumarDias(d, i); if (aFecha(x).getDay() === 5) return x; } return d; }
export function vSesionEditar(id) {
  const espera = esperar('Sesión'); if (espera) return espera;
  if (!esHost()) return { html: `<div class="pantalla sin-nav">${volver('#/grupo', 'Sesión')}<p class="vacio">Solo el host puede editar las sesiones.</p></div>` };
  const nueva = id === 'nueva';
  const s = nueva ? { titulo: '', fecha: proximoViernes(), hora: '', lugar: 'Salón de actos de Luria', procesos: '', plazasTerapeuta: '3', plazasPaciente: '3', apertura: 'Meditación guiada para llegar y poner el tono.', cierre: '', notas: '', ...Object.fromEntries(Object.entries(MINUTOS).map(([k, v]) => [k, String(v)])) } : sesion(id);
  if (!s) return vNoEncontrado();
  const num = (n, l, min = 1, max = 90) => `<div class="campo"><label for="e-${n}">${l}</label><input type="number" id="e-${n}" name="${n}" min="${min}" max="${max}" value="${esc(minutos(s, n))}" inputmode="numeric"></div>`;
  const vuelta = nueva ? '#/grupo' : `#/grupo/s/${encodeURIComponent(s.id)}`;
  return {
    html: `<div class="pantalla sin-nav">${volver(vuelta, nueva ? 'Nueva sesión' : 'Editar sesión')}
    <form id="f-ses" class="seccion">
      <div class="campo"><label for="e-titulo">Título</label><input type="text" id="e-titulo" name="titulo" value="${esc(s.titulo)}" placeholder="p. ej. Defusión y aceptación" maxlength="120"></div>
      <div class="dos-col"><div class="campo"><label for="e-fecha">Fecha</label><input type="date" id="e-fecha" name="fecha" required value="${esc(s.fecha)}"></div>
        <div class="campo"><label for="e-hora">Hora</label><input type="time" id="e-hora" name="hora" value="${esc(s.hora)}"></div></div>
      <div class="campo"><label for="e-lugar">Lugar</label><input type="text" id="e-lugar" name="lugar" value="${esc(s.lugar)}" maxlength="120"></div>
      <div class="campo"><span class="etiqueta">Procesos que se trabajan</span><div class="chips">${PROCESOS.map((p) => `<input type="checkbox" id="ep-${p.k}" name="procesos" value="${p.k}" ${procesosDe(s).includes(p.k) ? 'checked' : ''}><label for="ep-${p.k}">${esc(p.nombre)}</label>`).join('')}</div></div>
      <div class="dos-col"><div class="campo"><label for="e-pt">Plazas de terapeuta</label><input type="number" id="e-pt" name="plazasTerapeuta" min="0" max="20" value="${esc(s.plazasTerapeuta)}" inputmode="numeric"></div>
        <div class="campo"><label for="e-pp">Plazas de paciente</label><input type="number" id="e-pp" name="plazasPaciente" min="0" max="20" value="${esc(s.plazasPaciente)}" inputmode="numeric"></div></div>
      <span class="ayuda" style="margin-top:-6px">El público no tiene límite. 0 = sin límite.</span>
      <h2 class="etiqueta-grupo">Guion y tiempos</h2>
      <div class="campo"><label for="e-apertura">Apertura</label><textarea id="e-apertura" name="apertura" rows="2">${esc(s.apertura)}</textarea></div>
      <div class="dos-col">${num('minApertura', 'Apertura (min)')}${num('minCierre', 'Cierre (min)')}</div>
      <div class="tres-col">${num('minIntervencion', 'Intervención')}${num('minPaciente', 'Feedback paciente')}${num('minGrupo', 'Feedback grupo')}</div>
      <div class="campo"><label for="e-cierre">Cierre</label><textarea id="e-cierre" name="cierre" rows="2" placeholder="Meditación guiada, ronda de una palabra…">${esc(s.cierre)}</textarea></div>
      <div class="aviso-caja" id="e-calculo">${icon('reloj', 18)}<span></span></div>
      <div class="campo"><label for="e-notas">Notas para el grupo</label><textarea id="e-notas" name="notas" rows="3" placeholder="Qué traer, lectura previa, cómo preparar el caso del paciente…">${esc(s.notas)}</textarea></div>
      <button class="btn primario grande">${nueva ? 'Crear sesión' : 'Guardar cambios'}</button>
      ${!nueva ? `<button type="button" class="btn peligro" id="b-cancelar-ses">${s.estado === 'cancelada' ? 'Volver a programarla' : 'Cancelar la sesión'}</button>` : ''}
    </form></div>`,
    mount(r) {
      const form = r.querySelector('#f-ses');
      const calc = () => {
        const v = leerForm(form); const o = { ...s, ...v };
        const n = Number(v.plazasTerapeuta) || rondasDe(s.id || '').length || 0;
        const total = duracion(o, n);
        r.querySelector('#e-calculo span').innerHTML = n ? `Con <b>${n} ronda${n === 1 ? '' : 's'}</b> (una por terapeuta) la sesión dura <b>unas ${fmtDur(total)}</b>.${total > 125 ? ' Pasa de 2 horas: baja las plazas de terapeuta o los minutos.' : ''}` : 'Pon plazas de terapeuta para calcular la duración.';
      };
      form.addEventListener('input', calc); calc();
      form.addEventListener('submit', (e) => {
        e.preventDefault(); const v = leerForm(form);
        conCarga(form.querySelector('button.primario'), async () => {
          const o = { ...s, titulo: v.titulo.trim(), fecha: v.fecha, hora: v.hora || '', lugar: v.lugar.trim(), procesos: [].concat(v.procesos || []).join(','), plazasTerapeuta: String(Math.max(0, Number(v.plazasTerapeuta) || 0)), plazasPaciente: String(Math.max(0, Number(v.plazasPaciente) || 0)), apertura: v.apertura.trim(), cierre: v.cierre.trim(), notas: v.notas.trim() };
          for (const k of Object.keys(MINUTOS)) o[k] = String(Math.min(90, Math.max(1, Number(v[k]) || MINUTOS[k])));
          const guardada = await GR.guardarSesion(T.id, o);
          await recargar();
          toast(nueva ? 'Sesión creada.' : 'Cambios guardados.');
          irA(`#/grupo/s/${encodeURIComponent(guardada.id)}`);
        });
      });
      r.querySelector('#b-cancelar-ses')?.addEventListener('click', () => {
        const volverA = s.estado === 'cancelada';
        confirmar(volverA ? '¿Volver a programar la sesión?' : '¿Cancelar la sesión?', volverA ? 'Volverá a aparecer como próxima sesión.' : 'Seguirá en la lista como cancelada, con sus inscripciones.', volverA ? 'Programar' : 'Cancelar sesión', () => conCarga(null, async () => {
          await GR.guardarSesion(T.id, { ...s, estado: volverA ? 'programada' : 'cancelada' }); await recargar(); toast(volverA ? 'Sesión programada.' : 'Sesión cancelada.'); irA(`#/grupo/s/${encodeURIComponent(s.id)}`);
        }));
      });
    },
  };
}

// ======================= Organizar rondas (host) =======================
const borradorRondas = {};
export function vRondas(id) {
  const espera = esperar('Rondas'); if (espera) return espera;
  const s = sesion(id); if (!s) return vNoEncontrado();
  if (!esHost()) return { html: `<div class="pantalla sin-nav">${volver(`#/grupo/s/${encodeURIComponent(id)}`, 'Rondas')}<p class="vacio">Solo el host organiza las rondas.</p></div>` };
  const lista = (borradorRondas[id] = borradorRondas[id] || rondasDe(id).map((r) => ({ ...r })));
  const gente = inscritos(id);
  const opciones = (sel, rolPref) => {
    const grupos = [rolPref, ...Object.keys(ROLES).filter((k) => k !== rolPref)];
    return `<option value="">Por decidir</option>${grupos.map((k) => { const xs = gente.filter((x) => x.rol === k); return xs.length ? `<optgroup label="${esc(ROLES[k].plural)}">${xs.map((x) => `<option value="${esc(x.email)}" ${x.email === sel ? 'selected' : ''}>${esc(x.nombre || x.email)}</option>`).join('')}</optgroup>` : ''; }).join('')}`;
  };
  const fichas = S.datos().hexaflex.fichas.map((f) => f.nombre).filter(Boolean);
  const total = duracion(s, lista.length);
  return {
    html: `<div class="pantalla sin-nav">${volver(`#/grupo/s/${encodeURIComponent(id)}`, 'Organizar rondas')}
    <p class="pequeno suave" style="line-height:1.5">${esc(s.titulo || 'Sesión')} · ${deRol(id, 'terapeuta').length} terapeutas y ${deRol(id, 'paciente').length} pacientes apuntados.</p>
    <div class="botones"><button type="button" class="btn" data-act="pl-auto">${icon('pareja', 18)}Emparejar solo</button><button type="button" class="btn" data-act="pl-ronda-mas">${icon('mas', 18)}Añadir ronda</button></div>
    <form id="f-rondas" class="seccion">
    ${lista.map((r, i) => `<section class="tarjeta ronda-edit" data-i="${i}">
      <div class="fila-entre"><b>Ronda ${i + 1}</b><span style="display:flex;gap:4px">
        <button type="button" class="icono-btn peq" data-act="pl-ronda-subir" data-i="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Subir ronda ${i + 1}">${icon('atras', 16)}</button>
        <button type="button" class="icono-btn peq" data-act="pl-ronda-quitar" data-i="${i}" aria-label="Quitar ronda ${i + 1}">${icon('papelera', 16)}</button></span></div>
      <div class="dos-col"><div class="campo"><label for="rt-${i}">Terapeuta</label><select id="rt-${i}" data-campo="terapeutaEmail">${opciones(r.terapeutaEmail, 'terapeuta')}</select></div>
        <div class="campo"><label for="rp-${i}">Paciente</label><select id="rp-${i}" data-campo="pacienteEmail">${opciones(r.pacienteEmail, 'paciente')}</select></div></div>
      <div class="dos-col"><div class="campo"><label for="rpr-${i}">Proceso</label><select id="rpr-${i}" data-campo="proceso"><option value="">Libre</option>${PROCESOS.map((p) => `<option value="${p.k}" ${p.k === r.proceso ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('')}</select></div>
        <div class="campo"><label for="rte-${i}">Técnica</label><input type="text" id="rte-${i}" data-campo="tecnica" list="l-fichas" value="${esc(r.tecnica)}" placeholder="Metáfora, ejercicio…" maxlength="120"></div></div>
    </section>`).join('') || '<p class="vacio">Sin rondas. Pulsa «Emparejar solo» para crear una por terapeuta apuntado.</p>'}
    <datalist id="l-fichas">${fichas.map((n) => `<option value="${esc(n)}"></option>`).join('')}</datalist>
    <div class="aviso-caja">${icon('reloj', 18)}<span>${lista.length} ronda${lista.length === 1 ? '' : 's'} · la sesión dura <b>unas ${fmtDur(total)}</b>${total > 125 ? '. Pasa de 2 horas.' : '.'}</span></div>
    <button class="btn primario grande">Guardar rondas</button>
    <button type="button" class="btn texto" data-act="pl-ronda-descartar" style="align-self:center">Descartar cambios</button>
    </form></div>`,
    mount(r) {
      r.querySelectorAll('[data-campo]').forEach((el) => el.addEventListener('change', () => {
        const i = Number(el.closest('[data-i]').dataset.i); const campo = el.dataset.campo;
        lista[i][campo] = el.value.trim();
        if (campo === 'terapeutaEmail') lista[i].terapeutaNombre = el.value ? nombreDe(el.value) : '';
        if (campo === 'pacienteEmail') lista[i].pacienteNombre = el.value ? nombreDe(el.value) : '';
      }));
      r.querySelector('#f-rondas').addEventListener('submit', (e) => {
        e.preventDefault();
        conCarga(e.target.querySelector('button.primario'), async () => {
          await GR.guardarRondas(T.id, T, id, lista);
          delete borradorRondas[id];
          await recargar(); toast('Rondas guardadas.'); irA(`#/grupo/s/${encodeURIComponent(id)}`);
        });
      });
    },
  };
}
function emparejar(id) {
  const ter = deRol(id, 'terapeuta'); const pac = deRol(id, 'paciente');
  return ter.map((t, i) => {
    const p = pac[i]; // si hay menos pacientes que terapeutas, queda «Por decidir»
    return { terapeutaEmail: t.email, terapeutaNombre: t.nombre, pacienteEmail: p?.email || '', pacienteNombre: p?.nombre || '', proceso: '', tecnica: '', estado: 'pendiente' };
  });
}

// ======================= Feedback =======================
const PREGUNTAS = {
  sentir: '¿Cómo te has sentido?',
  conexion: '¿De qué manera te ha conectado la técnica, de forma experiencial, con la flexibilidad psicológica?',
  procesos: '¿Qué procesos has identificado en la interacción?',
  donde: '¿En qué momento lo has visto?',
  diferente: '¿Qué harías diferente?',
};
function modalFeedback(rid) {
  const r = T.rondas.find((x) => x.id === rid); if (!r) return;
  const comoPaciente = r.pacienteEmail === YO.email;
  const ya = T.feedback.find((f) => f.rondaId === rid && f.email === YO.email) || {};
  const ps = (ya.procesos || '').split(',');
  abrirModal(`<h2>Feedback · ronda ${r.orden}</h2>
    <p class="pequeno suave" style="line-height:1.45">${esc(r.terapeutaNombre || nombreDe(r.terapeutaEmail) || 'Terapeuta')} con ${esc(r.pacienteNombre || nombreDe(r.pacienteEmail) || 'paciente')}${r.tecnica ? ` · ${esc(r.tecnica)}` : ''}. ${comoPaciente ? 'Respondes como <b>paciente</b>.' : 'Respondes como <b>público</b>.'}</p>
    <form id="f-fb" class="seccion">
    ${comoPaciente ? `
      <div class="campo"><label for="fb-sentir">${PREGUNTAS.sentir}</label><textarea id="fb-sentir" name="sentir" rows="3" required>${esc(ya.sentir)}</textarea></div>
      <div class="campo"><label for="fb-conexion">${PREGUNTAS.conexion}</label><textarea id="fb-conexion" name="conexion" rows="4">${esc(ya.conexion)}</textarea></div>`
    : `
      <div class="campo"><span class="etiqueta">${PREGUNTAS.procesos}</span><div class="chips">${PROCESOS.map((p) => `<input type="checkbox" id="fp-${p.k}" name="procesos" value="${p.k}" ${ps.includes(p.k) ? 'checked' : ''}><label for="fp-${p.k}">${esc(p.nombre)}</label>`).join('')}</div></div>
      <div class="campo"><label for="fb-donde">${PREGUNTAS.donde}</label><textarea id="fb-donde" name="conexion" rows="3" placeholder="Cuando dijo… el paciente…">${esc(ya.conexion)}</textarea></div>
      <div class="campo"><label for="fb-dif">${PREGUNTAS.diferente}</label><textarea id="fb-dif" name="diferente" rows="3">${esc(ya.diferente)}</textarea></div>`}
    <span class="ayuda">Describe lo que viste u oíste, sin valorar a la persona. Lo leerá el grupo.</span>
    <div class="botones"><button type="button" class="btn" data-cerrar>Cancelar</button><button class="btn primario">Enviar</button></div>
    </form>`, (d) => {
    d.querySelector('#f-fb').addEventListener('submit', (e) => {
      e.preventDefault(); const v = leerForm(e.target);
      conCarga(e.target.querySelector('button.primario'), async () => {
        await GR.darFeedback(T.id, T, r, YO, { rol: comoPaciente ? 'paciente' : 'publico', sentir: (v.sentir || '').trim(), conexion: (v.conexion || '').trim(), procesos: [].concat(v.procesos || []).join(','), diferente: (v.diferente || '').trim() });
        await recargar(); cerrarModal(); toast('Feedback enviado. ¡Gracias!'); ctx.render();
      });
    });
  });
}

export function vFeedback(sid, rid) {
  const espera = esperar('Feedback'); if (espera) return espera;
  const s = sesion(sid); const r = T.rondas.find((x) => x.id === rid); if (!s || !r) return vNoEncontrado();
  const fb = feedbackDe(rid); const pac = fb.filter((f) => f.rol === 'paciente'); const pub = fb.filter((f) => f.rol === 'publico');
  const cuenta = Object.fromEntries(PROCESOS.map((p) => [p.k, pub.filter((f) => (f.procesos || '').split(',').includes(p.k)).length]));
  const max = Math.max(1, ...Object.values(cuenta));
  const yoTer = r.terapeutaEmail === YO.email;
  const bloque = (t, v) => (v ? `<div class="fb-campo"><span class="mini suave">${t}</span><p>${esc(v)}</p></div>` : '');
  return {
    html: `<div class="pantalla sin-nav">${volver(`#/grupo/s/${encodeURIComponent(sid)}`, `Ronda ${r.orden}`)}
    <div class="item-texto"><span class="tipo suave">${esc(s.titulo || 'Sesión')} · ${esc(fmtCorta(s.fecha))}</span><h1 class="titulo" style="font-size:24px">${esc(r.terapeutaNombre || nombreDe(r.terapeutaEmail) || 'Terapeuta')} con ${esc(r.pacienteNombre || nombreDe(r.pacienteEmail) || 'paciente')}</h1>
      ${r.tecnica || r.proceso ? `<span class="pequeno suave">${[r.tecnica, proceso(r.proceso)?.nombre].filter(Boolean).map(esc).join(' · ')}</span>` : ''}</div>
    ${!yoTer && abiertaFeedback(s, r) ? `<button class="btn primario" data-act="pl-feedback" data-r="${esc(r.id)}">${fb.some((f) => f.email === YO.email) ? 'Editar mi feedback' : 'Dar feedback'}</button>` : ''}
    <h2 class="etiqueta-grupo">Del paciente</h2>
    ${pac.map((f) => `<section class="tarjeta fb">${bloque(PREGUNTAS.sentir, f.sentir)}${bloque(PREGUNTAS.conexion, f.conexion)}</section>`).join('') || '<p class="vacio">El paciente aún no ha dejado su feedback.</p>'}
    <h2 class="etiqueta-grupo">Procesos que vio el público</h2>
    <section class="tarjeta">${pub.length ? PROCESOS.map((p) => `<div class="barra-proc"><span class="pequeno">${esc(p.nombre)}</span><div class="barra pilar-${PILAR[p.k]}"><div style="width:${(cuenta[p.k] / max) * 100}%"></div></div><b class="pequeno">${cuenta[p.k]}</b></div>`).join('') : '<p class="vacio" style="padding:8px">Sin respuestas todavía.</p>'}</section>
    <h2 class="etiqueta-grupo">Del público (${pub.length})</h2>
    ${pub.map((f) => `<section class="tarjeta fb"><span class="pequeno" style="font-weight:700">${esc(f.nombre || f.email.split('@')[0])}</span>
      ${(f.procesos || '').split(',').filter((k) => proceso(k)).length ? `<span class="insignias">${chipProcesos((f.procesos || '').split(',').filter((k) => proceso(k)))}</span>` : ''}
      ${bloque(PREGUNTAS.donde, f.conexion)}${bloque(PREGUNTAS.diferente, f.diferente)}</section>`).join('') || '<p class="vacio">Nadie del público ha respondido aún.</p>'}
    ${yoTer ? `<button class="btn" data-act="pl-a-hexaflex" data-r="${esc(r.id)}">${icon('hexa', 18)}Anotar esta práctica en mi Hexaflex</button>` : ''}
    </div>`,
  };
}
// El terapeuta guarda la práctica (con el feedback) en una ficha de su Hexaflex: cuenta como nivel «role play»
function modalAHexaflex(rid) {
  const r = T.rondas.find((x) => x.id === rid); const s = sesion(r.sesionId);
  const fichas = [...S.datos().hexaflex.fichas].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es'));
  const pre = fichas.find((f) => r.tecnica && f.nombre?.toLowerCase() === r.tecnica.toLowerCase());
  const fb = feedbackDe(rid);
  const resumen = [
    `Grupo Portland · ronda ${r.orden}${r.tecnica ? ` · ${r.tecnica}` : ''}`,
    ...fb.filter((f) => f.rol === 'paciente').map((f) => `Paciente: ${[f.sentir, f.conexion].filter(Boolean).join(' / ')}`),
    ...fb.filter((f) => f.rol === 'publico' && f.diferente).map((f) => `Haría diferente: ${f.diferente}`),
  ].join('\n');
  abrirModal(`<h2>Anotar en mi Hexaflex</h2>
    <form id="f-ah" class="seccion">
    <div class="campo"><label for="ah-f">Ficha</label><select id="ah-f" name="ficha" required><option value="">Elige una ficha…</option>${fichas.map((f) => `<option value="${esc(f.id)}" ${f === pre ? 'selected' : ''}>${esc(f.nombre)}</option>`).join('')}</select>
      <span class="ayuda">Si la técnica no está en tu banco, créala antes en Hexaflex.</span></div>
    <div class="campo"><label for="ah-t">Cómo fue</label><textarea id="ah-t" name="texto" rows="7">${esc(resumen)}</textarea></div>
    <div class="botones"><button type="button" class="btn" data-cerrar>Cancelar</button><button class="btn primario">Guardar</button></div></form>`, (d) => {
    d.querySelector('#f-ah').addEventListener('submit', (e) => {
      e.preventDefault(); const v = leerForm(e.target);
      const f = S.datos().hexaflex.fichas.find((x) => x.id === v.ficha); if (!f) return;
      S.actualizar(() => { f.exp = { ...(f.exp || {}), rp: true }; (f.notasExp = f.notasExp || []).push({ fecha: s.fecha || hoyISO(), donde: 'rp', texto: v.texto.trim() }); });
      cerrarModal(); toast('Práctica anotada en tu ficha.', { texto: 'Ver ficha', alPulsar: () => irA(`#/hexaflex/ficha/${encodeURIComponent(f.id)}`) });
    });
  });
}

// ======================= Temporizador en directo (host) =======================
const GUIA = {
  intervencion: 'Terapeuta y paciente interactúan. El público observa y anota qué procesos aparecen y en qué momento.',
  paciente: `${PREGUNTAS.sentir} ${PREGUNTAS.conexion}`,
  grupo: '¿Qué procesos habéis identificado en la interacción? ¿Qué haríais diferente?',
};
function fasesDe(s) {
  const out = [{ tipo: 'apertura', titulo: 'Apertura', min: minutos(s, 'minApertura'), guia: s.apertura || 'Meditación guiada para llegar y poner el tono.' }];
  for (const r of rondasDe(s.id)) {
    out.push({ tipo: 'intervencion', titulo: 'Intervención', min: minutos(s, 'minIntervencion'), ronda: r, guia: GUIA.intervencion });
    out.push({ tipo: 'paciente', titulo: 'Feedback del paciente', min: minutos(s, 'minPaciente'), ronda: r, guia: GUIA.paciente });
    out.push({ tipo: 'grupo', titulo: 'Feedback del grupo', min: minutos(s, 'minGrupo'), ronda: r, guia: GUIA.grupo });
  }
  out.push({ tipo: 'cierre', titulo: 'Cierre', min: minutos(s, 'minCierre'), guia: s.cierre || 'Cierre del grupo.' });
  return out;
}
const claveCrono = (sid) => `pl-crono-${sid}`;
function leerCrono(sid, fases) {
  let c = null; try { c = JSON.parse(localStorage.getItem(claveCrono(sid))); } catch {}
  if (!c || typeof c.i !== 'number' || c.i < 0 || c.i >= fases.length) c = { i: 0, corriendo: false, resto: fases[0].min * 60000, fin: 0, avisado: -1 };
  return c;
}
const guardarCrono = (sid, c) => { try { localStorage.setItem(claveCrono(sid), JSON.stringify(c)); } catch {} };
let tic = null; let audio = null; let bloqueo = null;
function pitar() {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.28, 0.56].forEach((t) => {
      const o = audio.createOscillator(); const g = audio.createGain();
      o.frequency.value = 660; o.connect(g); g.connect(audio.destination);
      g.gain.setValueAtTime(0.0001, audio.currentTime + t); g.gain.exponentialRampToValueAtTime(0.3, audio.currentTime + t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + t + 0.22);
      o.start(audio.currentTime + t); o.stop(audio.currentTime + t + 0.25);
    });
  } catch {}
  try { navigator.vibrate?.([200, 100, 200]); } catch {}
}
async function mantenerPantalla(on) {
  try {
    if (on && !bloqueo && navigator.wakeLock) bloqueo = await navigator.wakeLock.request('screen');
    if (!on && bloqueo) { await bloqueo.release(); bloqueo = null; }
  } catch { bloqueo = null; }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && location.hash.includes('/directo') && bloqueo === null) { /* se vuelve a pedir al tocar play */ } });

const fmtT = (ms) => { const neg = ms < 0; const s = Math.ceil(Math.abs(ms) / 1000); return `${neg ? '+' : ''}${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const restante = (c) => (c.corriendo ? c.fin - Date.now() : c.resto);

export function vDirecto(sid) {
  const espera = esperar('Temporizador'); if (espera) return espera;
  const s = sesion(sid); if (!s) return vNoEncontrado();
  if (!esHost()) return { html: `<div class="pantalla sin-nav">${volver(`#/grupo/s/${encodeURIComponent(sid)}`, 'Temporizador')}<p class="vacio">El temporizador lo lleva el host.</p></div>` };
  const fases = fasesDe(s); const c = leerCrono(sid, fases); const f = fases[c.i]; const r = f.ronda;
  const nR = rondasDe(sid).length;
  const pareja = r ? `<div class="directo-pareja"><span><span class="mini">Terapeuta</span><b>${esc(r.terapeutaNombre || nombreDe(r.terapeutaEmail) || 'Por decidir')}</b></span><span><span class="mini">Paciente</span><b>${esc(r.pacienteNombre || nombreDe(r.pacienteEmail) || 'Por decidir')}</b></span></div>${r.tecnica || r.proceso ? `<span class="directo-tecnica">${[r.tecnica, proceso(r.proceso)?.nombre].filter(Boolean).map(esc).join(' · ')}</span>` : ''}` : '';
  const R = 52; const L = 2 * Math.PI * R;
  return {
    html: `<div class="directo" data-fase="${f.tipo}">
    <header class="directo-cab"><a href="#/grupo/s/${encodeURIComponent(sid)}" class="volver" aria-label="Salir del temporizador">${icon('atras', 24)}</a><span class="pequeno" style="font-weight:700">${esc(s.titulo || 'Sesión')}</span><span class="pequeno">${c.i + 1}/${fases.length}</span></header>
    <div class="directo-cuerpo">
      <span class="directo-etq">${r ? `Ronda ${r.orden} de ${nR} · ` : ''}${esc(f.titulo)}</span>
      ${pareja}
      <div class="crono" role="timer" aria-live="off">
        <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="${R}" class="crono-fondo"/><circle cx="60" cy="60" r="${R}" class="crono-arco" id="crono-arco" stroke-dasharray="${L.toFixed(1)}" stroke-dashoffset="0" transform="rotate(-90 60 60)"/></svg>
        <span class="crono-t" id="crono-t">${fmtT(restante(c))}</span>
        <span class="crono-sub" id="crono-sub">${f.min} min</span>
      </div>
      <p class="directo-guia">${esc(f.guia)}</p>
      <div class="directo-ctrl">
        <button class="ctrl" data-act="pl-c-prev" ${c.i === 0 ? 'disabled' : ''} aria-label="Fase anterior">${icon('previo', 24)}</button>
        <button class="ctrl grande" data-act="pl-c-play" id="crono-play" aria-label="${c.corriendo ? 'Pausar' : 'Empezar'}">${icon(c.corriendo ? 'pausa' : 'play', 34)}</button>
        <button class="ctrl" data-act="pl-c-next" aria-label="${c.i === fases.length - 1 ? 'Terminar la sesión' : 'Siguiente fase'}">${icon(c.i === fases.length - 1 ? 'check' : 'saltar', 24)}</button>
      </div>
      <button class="btn texto directo-mas" data-act="pl-c-mas">+1 minuto</button>
    </div>
    <ol class="directo-linea" aria-label="Fases">${fases.map((x, i) => `<li class="${i < c.i ? 'hecha' : i === c.i ? 'actual' : ''}"><span>${x.ronda ? `R${x.ronda.orden} · ` : ''}${esc(x.titulo)}</span><span>${x.min}′</span></li>`).join('')}</ol>
    </div>`,
    mount(raiz) {
      clearInterval(tic);
      const pintar = () => {
        const t = raiz.querySelector('#crono-t'); if (!t || !raiz.isConnected) { clearInterval(tic); mantenerPantalla(false); return; }
        const cc = leerCrono(sid, fases); const ms = restante(cc); const tot = fases[cc.i].min * 60000;
        t.textContent = fmtT(ms);
        raiz.querySelector('#crono-arco').setAttribute('stroke-dashoffset', (L * (1 - Math.max(0, Math.min(1, ms / tot)))).toFixed(1));
        const fuera = ms <= 0;
        raiz.querySelector('.directo').classList.toggle('tiempo', fuera);
        raiz.querySelector('#crono-sub').textContent = fuera ? '¡Tiempo!' : cc.corriendo ? `${fases[cc.i].min} min` : 'En pausa';
        if (fuera && cc.corriendo && cc.avisado !== cc.i) { cc.avisado = cc.i; guardarCrono(sid, cc); pitar(); }
      };
      pintar(); tic = setInterval(pintar, 250);
      if (c.corriendo) mantenerPantalla(true);
    },
  };
}
// Cambia de fase y marca en la hoja la ronda que empieza o termina
async function irAFase(sid, nuevo) {
  const s = sesion(sid); const fases = fasesDe(s); const c = leerCrono(sid, fases);
  const antes = fases[c.i]; const despues = fases[nuevo];
  const n = { i: nuevo, corriendo: c.corriendo, resto: despues.min * 60000, fin: Date.now() + despues.min * 60000, avisado: -1 };
  guardarCrono(sid, n); ctx.render();
  const marcar = async (r, estado) => { if (!r || r.estado === estado) return; try { await GR.estadoRonda(T.id, r, estado); r.estado = estado; } catch (e) { toast('No se pudo actualizar la ronda en la hoja: ' + e.message, { error: true }); } };
  if (nuevo > c.i && antes.ronda && antes.ronda !== despues.ronda) await marcar(antes.ronda, 'hecha');
  if (despues.ronda) await marcar(despues.ronda, 'en_curso');
}

function icsDe(s) {
  const e = (t) => String(t || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
  const n = nRondas(s); const min = duracion(s, n || 3);
  const f = (s.fecha || hoyISO()).replaceAll('-', '');
  const inicio = s.hora ? `DTSTART:${f}T${s.hora.replace(':', '')}00\r\nDURATION:PT${min}M` : `DTSTART;VALUE=DATE:${f}`;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Portland Lab//ES', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', `UID:${s.id}@portland-lab`, `DTSTAMP:${stamp}`, inicio,
    `SUMMARY:${e(`Grupo Portland · ${s.titulo || T.grupo.nombre}`)}`, s.lugar ? `LOCATION:${e(s.lugar)}` : '', `DESCRIPTION:${e([procesosDe(s).map((k) => proceso(k).nombre).join(', '), s.notas].filter(Boolean).join('\n'))}`,
    'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\r\n');
}
function resumenSesion(s) {
  return [`Grupo Portland · ${s.titulo || T.grupo.nombre}`, `${fmtFecha(s.fecha)}${s.hora ? ` · ${s.hora}` : ''}`, s.lugar, procesosDe(s).length ? `Procesos: ${procesosDe(s).map((k) => proceso(k).nombre).join(', ')}` : '', s.notas].filter(Boolean).join('\n');
}

// ======================= Crear, unirse e invitar =======================
function modalCrear() {
  abrirModal(`<h2>Crear un grupo</h2>
    <p class="pequeno suave" style="line-height:1.5">${GR.modoPrueba() ? 'En modo prueba el grupo se guarda solo en este dispositivo.' : 'Se crea una hoja de Google en tu Drive (carpeta «Portland Lab»). Después la compartes con tus compañeros.'}</p>
    <form id="f-crear" class="seccion">
      <div class="campo"><label for="c-nombre">Nombre del grupo</label><input type="text" id="c-nombre" name="nombre" required maxlength="80" value="Grupo Portland Luria"></div>
      <div class="campo"><label for="c-yo">Tu nombre</label><input type="text" id="c-yo" name="yo" required maxlength="60" value="${esc(S.datos().ajustes.nombre)}" placeholder="Como te verán en el grupo"></div>
      <div class="botones"><button type="button" class="btn" data-cerrar>Cancelar</button><button class="btn primario">Crear</button></div>
    </form>`, (d) => {
    d.querySelector('#f-crear').addEventListener('submit', (e) => {
      e.preventDefault(); const v = leerForm(e.target);
      conCarga(e.target.querySelector('button.primario'), async () => {
        await ctx.google();
        S.actualizar((s) => { s.ajustes.nombre = v.yo.trim(); });
        const yo = await identidad();
        const id = await GR.crearGrupo(v.nombre.trim(), yo, S.datos().ajustes.carpetas);
        S.actualizar((s) => { s.grupos.push({ id, nombre: v.nombre.trim(), host: true, unido: hoyISO() }); s.grupoActivo = id; });
        T = null; await recargar();
        cerrarModal(); toast('Grupo creado. Ahora crea la primera sesión.'); irA('#/grupo');
      });
    });
  });
}
function idDeEnlace(texto) {
  const t = String(texto || '').trim();
  const m = t.match(/unirse\/([\w.:%-]+)/) || t.match(/spreadsheets\/d\/([\w-]+)/) || t.match(/^([\w-]{20,})$/);
  return m ? decodeURIComponent(m[1]) : '';
}
function modalUnirse() {
  abrirModal(`<h2>Unirme a un grupo</h2>
    <form id="f-unir" class="seccion">
      <div class="campo"><label for="u-enlace">Enlace de invitación</label><textarea id="u-enlace" name="enlace" rows="3" required placeholder="Pega aquí el enlace que te ha pasado el host"></textarea></div>
      <div class="botones"><button type="button" class="btn" data-cerrar>Cancelar</button><button class="btn primario">Continuar</button></div>
    </form>`, (d) => {
    d.querySelector('#f-unir').addEventListener('submit', (e) => {
      e.preventDefault(); const id = idDeEnlace(leerForm(e.target).enlace);
      if (!id) { toast('Ese enlace no parece una invitación de Portland Lab.', { error: true }); return; }
      cerrarModal(); irA(`#/unirse/${encodeURIComponent(id)}`);
    });
  });
}
export function vUnirse(id) {
  const ya = S.datos().grupos.find((g) => g.id === id);
  if (ya) { S.actualizar((s) => { s.grupoActivo = id; }); T = null; setTimeout(() => irA('#/grupo'), 0); return { html: '<div class="pantalla"></div>' }; }
  return {
    html: `<div class="pantalla sin-nav">${cabeceraGrupo('Invitación')}
    <section class="tarjeta"><span class="icono-caja bg-primario">${icon('pareja', 22)}</span><b style="font-size:18px">Te han invitado a un Grupo Portland</b>
      <p class="pequeno suave" style="line-height:1.5">Para unirte, conecta tu cuenta de Google: la app abrirá la hoja del grupo que el host ha compartido contigo.</p>
      <div class="campo"><label for="u-yo">Tu nombre</label><input type="text" id="u-yo" maxlength="60" value="${esc(S.datos().ajustes.nombre)}" placeholder="Como te verá el grupo"></div>
      <button class="btn primario grande" data-act="pl-unirse" data-id="${esc(id)}">${G.configurado() && !G.conectado() ? 'Conectar con Google y unirme' : 'Unirme al grupo'}</button></section>
    <div class="aviso-caja">${icon('ayuda', 18)}<span>Google mostrará «Google no ha verificado esta aplicación»: la app está en pruebas. Pulsa <b>Continuar</b> y marca todas las casillas.</span></div>
    </div>`,
  };
}
function modalInvitar() {
  const enlace = GR.enlaceInvitacion(T.id);
  abrirModal(`<h2>Invitar al grupo</h2>
    ${GR.modoPrueba() ? '<div class="aviso-caja"><span>En modo prueba no se puede invitar: el grupo solo existe en este dispositivo.</span></div>' : ''}
    <ol class="pasos-ia">
      <li><b>Comparte la hoja del grupo</b> con el correo de Google de cada compañero, como <b>Editor</b>.<a class="btn" href="${esc(G.enlaceHoja(T.id))}" target="_blank" rel="noopener">${icon('externo', 16)}Abrir la hoja y pulsar «Compartir»</a></li>
      <li><b>Pásales el enlace de invitación</b> por WhatsApp o correo.<textarea readonly rows="2" style="font-size:13px">${esc(enlace)}</textarea><button type="button" class="btn" id="b-copiar-inv">${icon('copiar', 16)}Copiar enlace</button></li>
      <li><b>Mientras la app esté en pruebas</b>, añade también su correo como usuario de prueba en Google Cloud (igual que en Luria Lab).</li>
    </ol>
    <button type="button" class="btn primario" data-cerrar>Hecho</button>`, (d) => {
    d.querySelector('#b-copiar-inv').addEventListener('click', () => copiar(enlace, 'Enlace copiado.'));
  });
}

// ======================= Acciones (clics) =======================
export const accionesPl = {
  'pl-conectar': (b) => conCarga(b, async () => { await ctx.google(); errorCarga = ''; T = null; ctx.render(); }),
  'pl-reintentar': () => { errorCarga = ''; T = null; ctx.render(); },
  'pl-actualizar': (b) => conCarga(b, async () => { await recargar(); ctx.render(); toast('Actualizado.', { ms: 2000 }); }),
  'pl-cambiar-grupo': (b) => { S.actualizar((s) => { s.grupoActivo = b.dataset.id; }); T = null; ctx.render(); },
  'pl-crear': () => modalCrear(),
  'pl-unirse-modal': () => modalUnirse(),
  'pl-invitar': () => modalInvitar(),
  'pl-unirse': (b) => conCarga(b, async () => {
    const id = b.dataset.id; const nombre = app().querySelector('#u-yo')?.value.trim();
    await ctx.google();
    if (nombre) S.actualizar((s) => { s.ajustes.nombre = nombre; });
    await identidad();
    const datos = await GR.leer(id);
    S.actualizar((s) => { if (!s.grupos.some((g) => g.id === id)) s.grupos.push({ id, nombre: datos.grupo.nombre, host: YO.email === datos.grupo.hostEmail, unido: hoyISO() }); s.grupoActivo = id; });
    T = datos; toast(`Te has unido a «${datos.grupo.nombre}».`); irA('#/grupo');
  }),
  'pl-apuntarse': (b) => conCarga(b, async () => {
    const s = sesion(b.dataset.s); const rol = b.dataset.rol;
    if (!YO.nombre) throw new Error('Pon tu nombre en Ajustes para que el grupo sepa quién eres.');
    await recargar(); // con los datos más recientes, para respetar las plazas
    await GR.apuntarse(T.id, T, sesion(s.id), YO, rol);
    await recargar(); toast(`Apuntado como ${ROLES[rol].nombre.toLowerCase()}.`); ctx.render();
  }),
  'pl-desapuntarse': (b) => confirmar('¿Borrarte de esta sesión?', 'Dejarás tu plaza libre para otra persona.', 'Borrarme', () => conCarga(null, async () => {
    const mia = miInscripcion(b.dataset.s); if (!mia) return;
    await GR.borrar(T.id, 'Inscripciones', mia); await recargar(); toast('Te has borrado de la sesión.'); ctx.render();
  })),
  'pl-feedback': (b) => modalFeedback(b.dataset.r),
  'pl-a-hexaflex': (b) => modalAHexaflex(b.dataset.r),
  'pl-ics': (b) => { const s = sesion(b.dataset.s); descargar(new Blob([icsDe(s)], { type: 'text/calendar;charset=utf-8' }), `grupo-portland-${s.fecha || 'sesion'}.ics`); },
  'pl-copiar-sesion': (b) => copiar(resumenSesion(sesion(b.dataset.s)), 'Resumen copiado.'),
  // Rondas
  'pl-auto': () => {
    const id = decodeURIComponent(location.hash.split('/')[3]);
    const nuevas = emparejar(id);
    if (!nuevas.length) { toast('Aún no hay terapeutas apuntados.', { error: true }); return; }
    const antes = borradorRondas[id] || [];
    borradorRondas[id] = nuevas.map((n, i) => (antes[i] ? { ...antes[i], ...n, proceso: antes[i].proceso, tecnica: antes[i].tecnica } : n));
    for (const r of antes.slice(nuevas.length)) borradorRondas[id].push(r);
    ctx.render(); toast('Parejas propuestas. Revísalas y guarda.');
  },
  'pl-ronda-mas': () => { const id = decodeURIComponent(location.hash.split('/')[3]); (borradorRondas[id] = borradorRondas[id] || []).push({ terapeutaEmail: '', pacienteEmail: '', proceso: '', tecnica: '', estado: 'pendiente' }); ctx.render(); },
  'pl-ronda-quitar': (b) => { const id = decodeURIComponent(location.hash.split('/')[3]); borradorRondas[id].splice(Number(b.dataset.i), 1); ctx.render(); },
  'pl-ronda-subir': (b) => { const id = decodeURIComponent(location.hash.split('/')[3]); const l = borradorRondas[id]; const i = Number(b.dataset.i); [l[i - 1], l[i]] = [l[i], l[i - 1]]; ctx.render(); },
  'pl-ronda-descartar': () => { const id = decodeURIComponent(location.hash.split('/')[3]); delete borradorRondas[id]; irA(`#/grupo/s/${encodeURIComponent(id)}`); },
  // Temporizador
  'pl-c-play': () => {
    const sid = decodeURIComponent(location.hash.split('/')[3]); const fases = fasesDe(sesion(sid)); const c = leerCrono(sid, fases);
    if (c.corriendo) { c.resto = c.fin - Date.now(); c.corriendo = false; mantenerPantalla(false); }
    else {
      c.fin = Date.now() + c.resto; c.corriendo = true; mantenerPantalla(true);
      try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); audio.resume?.(); } catch {}
      const r = fases[c.i].ronda;
      if (r && r.estado === 'pendiente') GR.estadoRonda(T.id, r, 'en_curso').then(() => { r.estado = 'en_curso'; }).catch(() => {});
    }
    guardarCrono(sid, c); ctx.render();
  },
  'pl-c-next': () => {
    const sid = decodeURIComponent(location.hash.split('/')[3]); const fases = fasesDe(sesion(sid)); const c = leerCrono(sid, fases);
    if (c.i < fases.length - 1) { irAFase(sid, c.i + 1); return; }
    confirmar('¿Terminar la sesión?', 'Se marcará como hecha y se cerrará el temporizador.', 'Terminar', () => conCarga(null, async () => {
      const s = sesion(sid); const ultima = fases.filter((f) => f.ronda).pop()?.ronda;
      if (ultima && ultima.estado !== 'hecha') await GR.estadoRonda(T.id, ultima, 'hecha');
      await GR.guardarSesion(T.id, { ...s, estado: 'hecha' });
      try { localStorage.removeItem(claveCrono(sid)); } catch {}
      mantenerPantalla(false); await recargar(); toast('Sesión terminada. ¡Buen trabajo!'); irA(`#/grupo/s/${encodeURIComponent(sid)}`);
    }));
  },
  'pl-c-prev': () => { const sid = decodeURIComponent(location.hash.split('/')[3]); const c = leerCrono(sid, fasesDe(sesion(sid))); if (c.i > 0) irAFase(sid, c.i - 1); },
  'pl-c-mas': () => { const sid = decodeURIComponent(location.hash.split('/')[3]); const c = leerCrono(sid, fasesDe(sesion(sid))); if (c.corriendo) c.fin = Math.max(c.fin, Date.now()) + 60000; else c.resto = Math.max(c.resto, 0) + 60000; c.avisado = -1; guardarCrono(sid, c); },
};
