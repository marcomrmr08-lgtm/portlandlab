// Flexeo · Hexaflex, Biblioteca (apuntes y lecturas), Diario y Role play
import * as S from './store.js';
import * as G from './google.js';
import * as P from './roleplay.js';
import { vLectura, accionesLecturas } from './lecturas.js';
import * as DI from './diario.js';
import * as H from './hexaflex.js';
import * as B from './biblioteca.js';
import { esc, fmtCorta, toast, conCarga, idbGet, idbSet, descargar, icon, cerrarModal } from './ui.js';
import { ctx, app, irA, nav, volver, confirmar, NAV } from './comun.js';

const VERSION = '1.4.0';
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
  const cuenta = !G.configurado()
    ? `<div class="aviso-caja">${icon('candado', 18)}<span><b>Modo prueba:</b> la app no tiene ID de cliente de Google y guarda todo solo en este dispositivo.</span></div>`
    : G.conectado()
      ? `<div class="fila-entre"><span class="pequeno"><span class="c-verde" style="font-weight:700">● Conectado</span> · tus datos se guardan en tu Drive</span><button class="btn pequeno" data-act="desconectar">Desconectar</button></div>`
      : `<p class="pequeno suave" style="line-height:1.5">Conecta para guardar tu diario y tus fichas en tu Drive y tenerlos en todos tus dispositivos.</p><button class="btn primario" data-act="conectar">Conectar con Google</button>`;
  return {
    html: `<div class="pantalla">${volver('#/hexaflex', 'Ajustes')}
    <h2 class="etiqueta-grupo">Cuenta de Google</h2>
    <section class="tarjeta">${cuenta}</section>
    <h2 class="etiqueta-grupo">Datos</h2>
    <section class="tarjeta">
      <button class="btn" data-act="exportar">${icon('descargar', 18)}Descargar una copia de mis datos</button>
      <button class="btn peligro" data-act="borrar-todo">${icon('papelera', 18)}Cerrar sesión y borrar este dispositivo</button>
    </section>
    <p class="mini suave" style="text-align:center">Flexeo ${VERSION}</p>
    </div>${nav('ajustes')}`,
  };
}

// ======================= Acciones (clics) =======================
const acciones = {
  ...H.accionesHx,
  ...DI.accionesDiario,
  ...accionesLecturas,
  ...P.accionesRoleplay,
  ...B.accionesBiblioteca,
  conectar: (b) => conCarga(b, async () => { await conectarYSincronizar(); toast('Conectado.'); render(); }),
  'sync-reintentar': () => subir(),
  desconectar: async () => { await G.desconectar(); toast('Desconectado: la app ya no tiene permiso en tu Google.'); render(); },
  exportar: () => descargar(new Blob([JSON.stringify(S.datos(), null, 2)], { type: 'application/json' }), `flexeo-${new Date().toISOString().slice(0, 10)}.json`),
  'borrar-todo': () => confirmar('¿Cerrar sesión y borrar este dispositivo?', 'Se quita el permiso de la app en tu Google y se borra lo guardado aquí. Tus datos siguen en tu Drive y vuelven al conectar.', 'Cerrar sesión y borrar', async () => {
    await G.desconectar();
    try { for (const k of Object.keys(localStorage)) if (k.startsWith('pl-') || k.startsWith('portland-lab')) localStorage.removeItem(k); } catch {}
    try { indexedDB.deleteDatabase('portland-lab'); } catch {}
    S.olvidarTodo(); location.hash = '#/hexaflex'; render();
  }),
};
app().addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (b && acciones[b.dataset.act]) { e.preventDefault(); acciones[b.dataset.act](b, e); }
});

// ======================= Rutas =======================
const redirigir = (a) => { setTimeout(() => irA(a), 0); return { html: '' }; };
const rutas = [
  [/^#\/?(hexaflex)?$/, () => H.vHexaflex()],
  [/^#\/hexaflex\/modelo$/, () => H.vHxModelo()],
  [/^#\/hexaflex\/p\/(\w+)$/, (k) => H.vHxProceso(k)],
  [/^#\/hexaflex\/ficha\/(.+)$/, (id) => H.vHxFicha(decodeURIComponent(id))],
  [/^#\/hexaflex\/editar\/(.+)$/, (id, p) => H.vHxEditar(decodeURIComponent(id), p)],
  [/^#\/hexaflex\/banco$/, () => H.vHxBanco()],
  [/^#\/biblioteca$/, () => B.vApuntes()],
  [/^#\/biblioteca\/lecturas$/, () => B.vLecturasBiblio()],
  [/^#\/biblioteca\/a\/([^/]+)$/, (id) => B.vApunte(decodeURIComponent(id))],
  [/^#\/lecturas\/l\/([^/]+)$/, (id) => vLectura(decodeURIComponent(id))],
  [/^#\/(lecturas|biblio)$/, () => redirigir('#/biblioteca/lecturas')],
  [/^#\/diario$/, () => DI.vDiario()],
  [/^#\/diario\/nueva$/, (p) => DI.vEditar('nueva', p)],
  [/^#\/diario\/editar\/([^/]+)$/, (id, p) => DI.vEditar(decodeURIComponent(id), p)],
  [/^#\/diario\/e\/([^/]+)$/, (id) => DI.vEntrada(decodeURIComponent(id))],
  [/^#\/roleplay$/, () => P.vRoleplay()],
  [/^#\/roleplay\/e\/([^/]+)$/, (id) => P.vEstrategia(decodeURIComponent(id))],
  [/^#\/roleplay\/e\/([^/]+)\/editar\/(\w+)$/, (id, sec) => P.vEditar(decodeURIComponent(id), sec)],
  [/^#\/roleplay\/e\/([^/]+)\/practicar$/, (id) => P.vPracticar(decodeURIComponent(id))],
  [/^#\/portland(.*)$/, (resto) => redirigir(`#/roleplay${resto}`)],
  [/^#\/ajustes$/, () => vAjustes()],
];

// ---------- Formato de escritorio (desde 960 px de ancho): menú lateral ----------
const ESCRITORIO = window.matchMedia('(min-width: 960px)');
ESCRITORIO.addEventListener?.('change', () => render());
const seccionDe = (ruta) => (ruta.startsWith('#/biblioteca') || ruta.startsWith('#/lecturas') ? 'biblioteca' : ruta.startsWith('#/diario') ? 'diario' : ruta.startsWith('#/roleplay') ? 'roleplay' : ruta.startsWith('#/ajustes') ? 'ajustes' : 'hexaflex');
function lateral(sec) {
  const enlace = ([r, t, i]) => `<a href="#/${r}" class="lat-enlace ${r === sec ? 'activo' : ''}" ${r === sec ? 'aria-current="page"' : ''}>${icon(i, 20)}<span>${t}</span></a>`;
  const estado = !G.configurado() ? `<span class="lat-estado">${icon('candado', 14)}Modo prueba · solo este dispositivo</span>`
    : barraEstado() || (G.conectado() ? '<span class="lat-estado ok"><i></i>Conectado a Google</span>' : '<button class="btn pequeno" data-act="conectar" style="width:100%">Conectar con Google</button>');
  return `<aside class="lateral" aria-label="Menú"><a href="#/hexaflex" class="lat-marca">Flexeo</a>
    <nav class="lat-grupo">${NAV.map(enlace).join('')}</nav><div class="lat-pie">${estado}</div></aside>`;
}

function render() {
  const [ruta, qs] = (location.hash || '#/hexaflex').split('?');
  const params = new URLSearchParams(qs || '');
  for (const [re, fn] of rutas) {
    const m = ruta.match(re);
    if (!m) continue;
    const v = fn(...m.slice(1), params);
    const completa = /\/practicar$/.test(ruta); // el modo práctica ocupa toda la pantalla
    if (!ESCRITORIO.matches || completa) {
      app().classList.remove('es-escritorio');
      app().innerHTML = (completa ? '' : barraEstado() || '<span class="estado-vacio"></span>') + v.html;
      v.mount?.(app());
      return;
    }
    app().classList.add('es-escritorio');
    app().innerHTML = `${lateral(seccionDe(ruta))}<div class="principal">${v.html}</div>`;
    v.mount?.(app().querySelector('.principal'));
    return;
  }
  location.hash = '#/hexaflex';
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
