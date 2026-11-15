// Portland Lab · Grupo Portland y Hexaflex
import * as S from './store.js';
import * as G from './google.js';
import * as P from './portland.js';
import * as H from './hexaflex.js';
import { esc, fmtCorta, toast, conCarga, idbGet, idbSet, descargar, icon, cerrarModal } from './ui.js';
import { ctx, app, irA, nav, volver, confirmar, NAV } from './comun.js';

const VERSION = '1.0.0';
S.cargar();

// ======================= Sincronización de tus datos con Drive =======================
let temporizador = null; let subiendo = false; let otraVez = false; let pendiente = false;
const LS = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, String(v)); } catch {} },
};
pendiente = LS.get('pl-pendiente') === '1';
function marcarPendiente(v) { pendiente = v; LS.set('pl-pendiente', v ? '1' : null); pintarEstado(); }
S.siempreAlGuardar(() => {
  if (!G.configurado()) return;
  if (!G.conectado()) { marcarPendiente(true); return; }
  clearTimeout(temporizador); temporizador = setTimeout(subir, 1200); pintarEstado();
});
async function subir() {
  temporizador = null;
  if (subiendo) { otraVez = true; return; }
  if (!G.conectado()) { marcarPendiente(true); return; }
  subiendo = true; pintarEstado();
  try { await G.escribirDatos(S.datos()); marcarPendiente(false); LS.set('pl-ultima', Date.now()); }
  catch (e) { marcarPendiente(true); console.warn('No se pudo sincronizar', e); }
  subiendo = false; pintarEstado();
  if (otraVez) { otraVez = false; subir(); }
}
async function guardarCopia(motivo, siPasaron = 0) {
  try {
    const lista = (await idbGet('copias')) || [];
    if (siPasaron && lista[0] && Date.now() - lista[0].fecha < siPasaron) return;
    lista.unshift({ fecha: Date.now(), motivo, datos: JSON.parse(JSON.stringify(S.datos())) });
    await idbSet('copias', lista.slice(0, 5));
  } catch (e) { console.warn('Copia automática', e); }
}
// Conecta y junta los datos de este dispositivo con los de Drive (sin sustituir nada)
async function conectarYSincronizar() {
  await G.conectar();
  await guardarCopia('Antes de juntar con tu Drive', 3600e3);
  const remoto = await G.leerDatos();
  if (remoto) S.reemplazar(S.fusionar(S.datos(), remoto));
  await G.escribirDatos(S.datos());
  marcarPendiente(false); LS.set('pl-ultima', Date.now());
  H.subirAudiosPendientes().catch((e) => console.warn('Audios', e));
}
ctx.google = async () => { if (G.configurado() && !G.conectado()) await conectarYSincronizar(); };
ctx.conectado = () => G.conectado();

// ---------- Indicador de guardado ----------
function barraEstado() {
  if (!G.configurado()) return '';
  if (G.conectado()) {
    if (subiendo || temporizador) return '<div class="estado-sync guardando" role="status"><i></i>Guardando en tu Drive…</div>';
    if (pendiente) return '<button class="estado-sync aviso" data-act="sync-reintentar"><i></i>Cambios sin guardar en Drive · Toca para reintentar</button>';
    return '';
  }
  if (!G.conectadoAntes() && !pendiente) return '';
  return `<button class="estado-sync ${pendiente ? 'aviso' : 'neutro'}" data-act="conectar"><i></i>${pendiente ? 'Cambios sin guardar en Drive · Toca para conectar' : 'Toca para conectar con Google'}</button>`;
}
function pintarEstado() {
  const html = barraEstado();
  document.querySelectorAll('.estado-sync, .estado-vacio').forEach((el) => {
    const t = document.createElement('template'); t.innerHTML = html || '<span class="estado-vacio"></span>';
    el.replaceWith(t.content.firstElementChild);
  });
}
window.addEventListener('online', () => { if (G.conectado() && pendiente) subir(); });

// ======================= Ajustes =======================
function vAjustes() {
  const s = S.datos(); const g = P.grupoActivo();
  let invitada = false; try { invitada = localStorage.getItem('pl-demo-invitado') === '1'; } catch {}
  const cuenta = !G.configurado()
    ? `<div class="aviso-caja">${icon('candado', 18)}<span><b>Modo prueba:</b> la app no tiene ID de cliente de Google y guarda todo solo en este dispositivo.</span></div>
       <label class="fila-check"><input type="checkbox" id="aj-invitada" ${invitada ? 'checked' : ''}> Ver el grupo como invitada (para comprobar qué ven los demás)</label>`
    : G.conectado()
      ? `<div class="fila-entre"><span class="pequeno"><span class="c-verde" style="font-weight:700">● Conectado</span> · tus fichas se guardan en tu Drive</span><button class="btn pequeno" data-act="desconectar">Desconectar</button></div>`
      : `<p class="pequeno suave" style="line-height:1.5">Conecta para guardar tus fichas en tu Drive y abrir la hoja del grupo.</p><button class="btn primario" data-act="conectar">Conectar con Google</button>`;
  return {
    html: `<div class="pantalla">${volver('#/grupo', 'Ajustes')}
    <section class="tarjeta"><div class="campo"><label for="aj-nombre">Tu nombre</label><input type="text" id="aj-nombre" maxlength="60" value="${esc(s.ajustes.nombre)}" placeholder="Como te verá el grupo"><span class="ayuda">Es el nombre que aparece al apuntarte y en tu feedback.</span></div></section>
    <h2 class="etiqueta-grupo">Cuenta de Google</h2>
    <section class="tarjeta">${cuenta}</section>
    <h2 class="etiqueta-grupo">Tus grupos</h2>
    <section class="tarjeta lista">${s.grupos.map((x) => `<div class="fila"><span class="item-texto"><span class="item-titulo">${esc(x.nombre || 'Grupo')}${x.id === g?.id ? ' <span class="insignia ok">Abierto</span>' : ''}</span><span class="item-sub">${x.host ? 'Eres el host' : 'Invitado'}${x.unido ? ` · desde el ${esc(fmtCorta(x.unido))}` : ''}</span></span>
      <span style="display:flex;gap:4px">${G.configurado() ? `<a class="icono-btn" href="${esc(G.enlaceHoja(x.id))}" target="_blank" rel="noopener" aria-label="Abrir la hoja de ${esc(x.nombre)}">${icon('hoja', 18)}</a>` : ''}<button class="icono-btn" data-act="grupo-quitar" data-id="${esc(x.id)}" aria-label="Dejar de ver ${esc(x.nombre)}">${icon('papelera', 18)}</button></span></div>`).join('') || '<p class="vacio">Aún no sigues ningún grupo.</p>'}</section>
    <h2 class="etiqueta-grupo">Hexaflex</h2>
    <section class="tarjeta"><p class="pequeno suave" style="line-height:1.5">Trae las fichas, tus notas y la bibliografía que ya tienes en Luria Lab. Luria Lab no se modifica.</p>
      <button class="btn" data-act="importar-luria" ${G.configurado() ? '' : 'disabled'}>${icon('descargar', 18)}Traer mis fichas de Luria Lab</button>
      ${G.configurado() ? '' : '<span class="mini suave">Necesita la conexión con Google.</span>'}</section>
    <h2 class="etiqueta-grupo">Datos</h2>
    <section class="tarjeta">
      <button class="btn" data-act="exportar">${icon('descargar', 18)}Descargar una copia de mis datos</button>
      <button class="btn peligro" data-act="borrar-todo">${icon('papelera', 18)}Cerrar sesión y borrar este dispositivo</button>
      <span class="mini suave" style="line-height:1.45">La hoja del grupo no se borra: sigue en el Drive del host.</span>
    </section>
    <p class="mini suave" style="text-align:center">Portland Lab ${VERSION}</p>
    </div>${nav('ajustes')}`,
    mount(r) {
      const n = r.querySelector('#aj-nombre');
      n.addEventListener('change', () => { S.actualizar((s2) => { s2.ajustes.nombre = n.value.trim(); }); P.olvidarCarga(); toast('Nombre guardado.'); });
      r.querySelector('#aj-invitada')?.addEventListener('change', (e) => { LS.set('pl-demo-invitado', e.target.checked ? '1' : null); P.olvidarCarga(); toast(e.target.checked ? 'Ahora ves el grupo como invitada.' : 'Ahora ves el grupo como host.'); });
    },
  };
}

// ======================= Acciones (clics) =======================
const acciones = {
  ...H.accionesHx,
  ...P.accionesPl,
  conectar: (b) => conCarga(b, async () => { await conectarYSincronizar(); P.olvidarCarga(); toast('Conectado.'); render(); }),
  'sync-reintentar': () => subir(),
  desconectar: async () => { await G.desconectar(); P.olvidarCarga(); toast('Desconectado: la app ya no tiene permiso en tu Google.'); render(); },
  'grupo-quitar': (b) => confirmar('¿Dejar de ver este grupo?', 'Desaparece de tu app. La hoja sigue en el Drive del host y puedes volver con el enlace de invitación.', 'Dejar de verlo', () => {
    S.actualizar((s) => { s.grupos = s.grupos.filter((x) => x.id !== b.dataset.id); if (s.grupoActivo === b.dataset.id) s.grupoActivo = s.grupos[0]?.id || null; });
    P.olvidarCarga(); render();
  }),
  'importar-luria': (b) => conCarga(b, async () => {
    await ctx.google();
    const luria = await G.leerDatosLuria();
    if (!luria) throw new Error('No he encontrado datos de Luria Lab en tu Drive. ¿Has conectado Luria Lab con esta misma cuenta?');
    await guardarCopia('Antes de traer las fichas de Luria Lab');
    const r = S.importarLuria(luria);
    toast(r.fichas || r.libros ? `Traídas ${r.fichas} fichas y ${r.libros} libros de Luria Lab.` : 'Ya tenías todas las fichas de Luria Lab.');
    render();
  }),
  exportar: () => descargar(new Blob([JSON.stringify(S.datos(), null, 2)], { type: 'application/json' }), `portland-lab-${new Date().toISOString().slice(0, 10)}.json`),
  'borrar-todo': () => confirmar('¿Cerrar sesión y borrar este dispositivo?', 'Se quita el permiso de la app en tu Google y se borra lo guardado aquí. Tus fichas siguen en tu Drive y vuelven al conectar.', 'Cerrar sesión y borrar', async () => {
    await G.desconectar();
    try { for (const k of Object.keys(localStorage)) if (k.startsWith('pl-') || k.startsWith('portland-lab')) localStorage.removeItem(k); } catch {}
    try { indexedDB.deleteDatabase('portland-lab'); } catch {}
    S.olvidarTodo(); P.olvidarCarga(); location.hash = '#/grupo'; render();
  }),
};
app().addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (b && acciones[b.dataset.act]) { e.preventDefault(); acciones[b.dataset.act](b, e); }
});

// ======================= Rutas =======================
const rutas = [
  [/^#\/?(grupo)?$/, () => P.vGrupo()],
  [/^#\/grupo\/s\/([^/]+)\/editar$/, (id) => P.vSesionEditar(decodeURIComponent(id))],
  [/^#\/grupo\/s\/([^/]+)\/rondas$/, (id) => P.vRondas(decodeURIComponent(id))],
  [/^#\/grupo\/s\/([^/]+)\/directo$/, (id) => P.vDirecto(decodeURIComponent(id))],
  [/^#\/grupo\/s\/([^/]+)\/r\/([^/]+)$/, (id, r) => P.vFeedback(decodeURIComponent(id), decodeURIComponent(r))],
  [/^#\/grupo\/s\/([^/]+)$/, (id) => P.vSesion(decodeURIComponent(id))],
  [/^#\/unirse\/([^/]+)$/, (id) => P.vUnirse(decodeURIComponent(id))],
  [/^#\/hexaflex$/, () => H.vHexaflex()],
  [/^#\/hexaflex\/modelo$/, () => H.vHxModelo()],
  [/^#\/hexaflex\/p\/(\w+)$/, (k) => H.vHxProceso(k)],
  [/^#\/hexaflex\/ficha\/(.+)$/, (id) => H.vHxFicha(decodeURIComponent(id))],
  [/^#\/hexaflex\/editar\/(.+)$/, (id, p) => H.vHxEditar(decodeURIComponent(id), p)],
  [/^#\/hexaflex\/banco$/, () => H.vHxBanco()],
  [/^#\/biblio$/, () => H.vBiblio()],
  [/^#\/ajustes$/, () => vAjustes()],
];

// ---------- Formato de escritorio (desde 960 px de ancho): menú lateral ----------
const ESCRITORIO = window.matchMedia('(min-width: 960px)');
ESCRITORIO.addEventListener?.('change', () => render());
const seccionDe = (ruta) => (ruta.startsWith('#/hexaflex') || ruta.startsWith('#/biblio') ? 'hexaflex' : ruta.startsWith('#/ajustes') ? 'ajustes' : 'grupo');
function lateral(sec) {
  const enlace = ([r, t, i]) => `<a href="#/${r}" class="lat-enlace ${r === sec ? 'activo' : ''}" ${r === sec ? 'aria-current="page"' : ''}>${icon(i, 20)}<span>${t}</span></a>`;
  const estado = !G.configurado() ? `<span class="lat-estado">${icon('candado', 14)}Modo prueba · solo este dispositivo</span>`
    : barraEstado() || (G.conectado() ? '<span class="lat-estado ok"><i></i>Conectado a Google</span>' : '<button class="btn pequeno" data-act="conectar" style="width:100%">Conectar con Google</button>');
  return `<aside class="lateral" aria-label="Menú"><a href="#/grupo" class="lat-marca">Portland Lab</a>
    <nav class="lat-grupo">${NAV.map(enlace).join('')}</nav><div class="lat-pie">${estado}</div></aside>`;
}

function render() {
  const [ruta, qs] = (location.hash || '#/grupo').split('?');
  const params = new URLSearchParams(qs || '');
  for (const [re, fn] of rutas) {
    const m = ruta.match(re);
    if (!m) continue;
    const v = fn(...m.slice(1), params);
    const directo = /\/directo$/.test(ruta);
    if (!ESCRITORIO.matches || directo) {
      app().classList.remove('es-escritorio');
      app().innerHTML = (directo ? '' : barraEstado() || '<span class="estado-vacio"></span>') + v.html;
      v.mount?.(app());
      return;
    }
    app().classList.add('es-escritorio');
    app().innerHTML = `${lateral(seccionDe(ruta))}<div class="principal">${v.html}</div>`;
    v.mount?.(app().querySelector('.principal'));
    return;
  }
  location.hash = '#/grupo';
}
ctx.render = render;

window.addEventListener('hashchange', () => { cerrarModal(); render(); window.scrollTo(0, 0); });
render();
guardarCopia('Al abrir la app', 6 * 3600e3);

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((reg) => {
    reg.update();
    let recargado = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!recargado) { recargado = true; location.reload(); } });
  }).catch((e) => console.warn('Service worker', e));
}
