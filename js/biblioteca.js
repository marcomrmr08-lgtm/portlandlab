// © 2026 Marco Martínez. Todos los derechos reservados. Ver LICENSE.
// Biblioteca: tus apuntes en PDF (como la Guía clínica de Luria Lab) y tus lecturas.
// Los PDF se suben a tu Drive (carpeta «Flexeo/Apuntes») y se ven con un visor propio.
// La primera vez que abres un PDF se guarda en el dispositivo para que vuelva a abrir rápido y sin conexión.
import * as S from './store.js';
import * as G from './google.js';
import { CONFIG } from './config.js';
import { PROCESOS } from './procesos.js';
import { esc, hoyISO, fmtCorta, toast, abrirModal, cerrarModal, conCarga, idbGet, idbSet, icon } from './ui.js';
import { ctx, app, irA, nav, volver, leerForm, confirmar, vNoEncontrado as noEncontrado } from './comun.js';
import { htmlLecturas, montarLecturas } from './lecturas.js';

const vNoEncontrado = () => noEncontrado('#/biblioteca');
const enApp = (ruta) => new URL(`../${ruta}`, import.meta.url).href;
const A = () => S.datos().apuntes;
// Temas: los procesos del Hexaflex y los grandes bloques de la formación
export const TEMAS = [...PROCESOS.map((p) => p.nombre), 'Desesperanza creativa', 'Entrevista inicial', 'Análisis funcional', 'Evaluación', 'Terapias contextuales', 'Ansiedad', 'Estado de ánimo', 'Infancia y adolescencia', 'Familias'];
const EMOJIS = ['🧠', '💬', '📋', '🔍', '🧩', '💡', '🎯', '🌱', '🌊', '🧘', '❤️', '⚖️', '🔄', '📚'];

// Cabecera común: Apuntes | Lecturas
const cabecera = (activo) => `<div class="item-texto"><h1 class="titulo">Biblioteca</h1><span class="suave pequeno">Tus apuntes en PDF y tus lecturas, siempre a mano</span></div>
  <div class="segmentado" role="tablist"><a href="#/biblioteca" class="seg-btn ${activo === 'apuntes' ? 'activo' : ''}" role="tab" aria-selected="${activo === 'apuntes'}">Apuntes</a><a href="#/biblioteca/lecturas" class="seg-btn ${activo === 'lecturas' ? 'activo' : ''}" role="tab" aria-selected="${activo === 'lecturas'}">Lecturas</a></div>`;

let tema = ''; let q = '';
export function vApuntes() {
  const g = A();
  const temas = [...new Set([...TEMAS.filter((t) => g.some((e) => e.temas?.includes(t))), ...g.flatMap((e) => e.temas || [])])];
  const busq = q.trim().toLowerCase();
  const lista = g.filter((e) => (!tema || e.temas?.includes(tema)) && (!busq || [e.titulo, e.fuente, ...(e.temas || [])].join(' ').toLowerCase().includes(busq)))
    .sort((x, y) => (y.fecha || '').localeCompare(x.fecha || ''));
  return {
    html: `<div class="pantalla">${cabecera('apuntes')}
    ${g.length ? `<div class="campo"><label for="ap-buscar" class="oculto">Buscar en tus apuntes</label><input type="search" id="ap-buscar" placeholder="Buscar por título, tema o fuente" value="${esc(q)}" autocomplete="off"></div>
      ${temas.length ? `<div class="chips"><button class="chip ${!tema ? 'activo' : ''}" data-act="ap-tema" data-v="">Todo</button>${temas.map((t) => `<button class="chip ${tema === t ? 'activo' : ''}" data-act="ap-tema" data-v="${esc(t)}">${esc(t)}</button>`).join('')}</div>` : ''}
      ${lista.length ? `<div class="guia-tarjetas">${lista.map((e) => `<a href="#/biblioteca/a/${encodeURIComponent(e.id)}" class="guia-tarjeta">
        <span class="gt-icono">${e.emoji ? esc(e.emoji) : icon('doc', 28)}</span>
        <span class="gt-titulo">${esc(e.titulo)}</span>
        ${e.fuente ? `<span class="gt-fuente">${esc(e.fuente)}</span>` : ''}
        ${e.temas?.length ? `<span class="gt-temas">${e.temas.slice(0, 2).map((t) => `<span>${esc(t)}</span>`).join('')}</span>` : ''}
      </a>`).join('')}</div>` : '<p class="vacio">Nada coincide con la búsqueda.</p>'}`
    : `<div class="tarjeta" style="align-items:center;text-align:center;padding:30px 18px;gap:10px">${icon('doc', 30)}<b>Sube tus primeros apuntes</b><p class="pequeno suave" style="line-height:1.5;max-width:30em">Pasa a limpio tus apuntes de tutorías, seminarios o lecturas, súbelos en PDF y tenlos ordenados por temas para consultarlos cuando los necesites.</p></div>`}
    </div><button class="fab" data-act="ap-subir">${icon('subir', 22)}Subir un PDF</button>${nav('biblioteca')}`,
    mount(r) {
      const b = r.querySelector('#ap-buscar');
      b?.addEventListener('input', () => { q = b.value; const pos = b.selectionStart; ctx.render(); const nb = app().querySelector('#ap-buscar'); nb?.focus(); nb?.setSelectionRange(pos, pos); });
    },
  };
}
export function vLecturasBiblio() {
  return {
    html: `<div class="pantalla">${cabecera('lecturas')}${htmlLecturas()}</div><button class="fab" data-act="lec-nueva">${icon('mas', 22)}Nueva lectura</button>${nav('biblioteca')}`,
    mount: montarLecturas,
  };
}

// ---------- Subir y editar ----------
function selectorEmoji(actual = '') {
  return `<div class="campo"><span class="etiqueta">Icono <span class="suave" style="font-weight:400">(opcional)</span></span>
    <div class="emojis"><input type="radio" name="emoji" id="em-no" value="" ${!actual ? 'checked' : ''}><label for="em-no" class="em-ninguno">Ninguno</label>${EMOJIS.map((e, i) => `<input type="radio" name="emoji" id="em-${i}" value="${e}" ${actual === e ? 'checked' : ''}><label for="em-${i}">${e}</label>`).join('')}</div></div>`;
}
const chipsTemas = (sel = []) => `<div class="campo"><span class="etiqueta">Temas</span><div class="chips">${TEMAS.map((t, i) => `<input type="checkbox" id="at-${i}" name="temas" value="${esc(t)}" ${sel.includes(t) ? 'checked' : ''}><label for="at-${i}">${esc(t)}</label>`).join('')}</div></div>`;

function modalSubir() {
  abrirModal(`<h2>Subir apuntes en PDF</h2>
    <form id="f-pdf" class="seccion">
      <div class="campo"><label for="a-pdf">Archivo PDF</label><input type="file" id="a-pdf" name="pdf" accept="application/pdf,.pdf" required></div>
      <div class="campo"><label for="a-titulo">Título</label><input id="a-titulo" name="titulo" required maxlength="140" placeholder="p. ej. Análisis funcional"></div>
      <div class="campo"><label for="a-fuente">Fuente <span class="suave" style="font-weight:400">(opcional)</span></label><input id="a-fuente" name="fuente" maxlength="140" placeholder="Tutoría, seminario, libro…"></div>
      ${selectorEmoji()}
      ${chipsTemas()}
      ${G.configurado() ? '<span class="ayuda">Se guarda en tu Google Drive, en la carpeta «Flexeo/Apuntes».</span>' : '<span class="ayuda">Modo prueba: el PDF se guarda solo en este dispositivo.</span>'}
      <div class="botones"><button type="button" class="btn" data-cerrar>Cancelar</button><button class="btn primario" id="a-subir">Subir</button></div>
    </form>`, (d) => {
    const archivo = d.querySelector('#a-pdf'); const tit = d.querySelector('#a-titulo');
    archivo.addEventListener('change', () => { const f = archivo.files?.[0]; if (f && !tit.value) tit.value = f.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim(); });
    d.querySelector('#f-pdf').addEventListener('submit', (ev) => {
      ev.preventDefault(); const v = leerForm(ev.target); const pdf = archivo.files?.[0];
      if (!pdf) return;
      if (!/pdf$/i.test(pdf.type) && !/\.pdf$/i.test(pdf.name)) { toast('Elige un archivo PDF.', { error: true }); return; }
      if (pdf.size > 50 * 1048576) { toast('El PDF pasa de 50 MB. Prueba a comprimirlo.', { error: true }); return; }
      conCarga(d.querySelector('#a-subir'), async () => {
        const titulo = v.titulo.trim();
        let archivoId;
        if (G.configurado()) {
          await ctx.google();
          const dir = await G.carpeta([CONFIG.CARPETA_RAIZ, 'Apuntes'], S.datos().ajustes.carpetas);
          archivoId = await G.subirGrande(`${titulo}.pdf`, pdf, 'application/pdf', dir);
        } else archivoId = 'local-' + S.nuevoId();
        try { await idbSet(`pdf-${archivoId}`, await pdf.arrayBuffer()); } catch {}
        const e = { id: S.nuevoId(), archivoId, titulo, fuente: (v.fuente || '').trim(), emoji: v.emoji || '', temas: [].concat(v.temas || []), fecha: hoyISO() };
        S.actualizar((s) => { s.apuntes.push(e); });
        cerrarModal(); toast('PDF añadido a tu Biblioteca.'); irA(`#/biblioteca/a/${encodeURIComponent(e.id)}`);
      });
    });
  });
}
function modalEditar(e) {
  abrirModal(`<h2>Editar</h2>
    <form id="f-ap" class="seccion">
      <div class="campo"><label for="ae-titulo">Título</label><input id="ae-titulo" name="titulo" required maxlength="140" value="${esc(e.titulo)}"></div>
      <div class="campo"><label for="ae-fuente">Fuente</label><input id="ae-fuente" name="fuente" maxlength="140" value="${esc(e.fuente)}"></div>
      ${selectorEmoji(e.emoji)}
      ${chipsTemas(e.temas || [])}
      <div class="botones"><button type="button" class="btn" data-cerrar>Cancelar</button><button class="btn primario">Guardar</button></div>
    </form>`, (d) => {
    d.querySelector('#f-ap').addEventListener('submit', (ev) => {
      ev.preventDefault(); const v = leerForm(ev.target);
      S.actualizar(() => { e.titulo = v.titulo.trim(); e.fuente = v.fuente.trim(); e.emoji = v.emoji || ''; e.temas = [].concat(v.temas || []); });
      cerrarModal(); toast('Guardado.'); ctx.render();
    });
  });
}

// ---------- Ver un PDF ----------
export function vApunte(id) {
  const e = A().find((x) => x.id === id); if (!e) return vNoEncontrado();
  const enDrive = !String(e.archivoId).startsWith('local-');
  return {
    html: `<div class="pantalla sin-nav ancha-pdf">${volver('#/biblioteca', 'Biblioteca')}
    <article class="guia-entrada">
      <div class="guia-cabecera"><button type="button" class="guia-emoji ${e.emoji ? '' : 'vacio'}" data-act="ap-editar" data-id="${esc(e.id)}" aria-label="${e.emoji ? 'Cambiar el icono' : 'Añadir un icono'}">${e.emoji ? esc(e.emoji) : icon('mas', 18)}</button>
        <h1 class="titulo" style="font-size:24px">${esc(e.titulo)}</h1>
        <button type="button" class="icono-btn" data-act="ap-editar" data-id="${esc(e.id)}" aria-label="Editar título, icono y temas">${icon('editar', 18)}</button></div>
      <span class="pequeno suave">${[e.fuente, e.fecha && `Subido el ${fmtCorta(e.fecha)}`].filter(Boolean).map(esc).join(' · ')}</span>
      ${e.temas?.length ? `<span class="insignias">${e.temas.map((t) => `<button class="insignia" data-act="ap-tema" data-v="${esc(t)}" data-ir="1">${esc(t)}</button>`).join('')}</span>` : ''}
      <div class="visor-pdf" id="visor-pdf" role="button" tabindex="0" aria-label="Ver el PDF a pantalla completa"><p class="mini suave visor-msg"><span class="spinner" aria-hidden="true"></span> Cargando el PDF…</p></div>
      <span class="mini suave" style="text-align:center">Toca el PDF para verlo a pantalla completa</span>
    </article>
    <div class="botones"><a href="#/diario/nueva?tipo=nota" class="btn">${icon('diario', 16)}Anotar en el diario</a>${enDrive ? `<a class="btn" href="${esc(G.enlaceArchivo(e.archivoId))}" target="_blank" rel="noopener">${icon('externo', 16)}Abrir en Drive</a>` : ''}</div>
    <button class="btn texto peligro" data-act="ap-borrar" data-id="${esc(e.id)}">Quitar de la Biblioteca</button>
    </div>`,
    mount(r) { montarVisor(r.querySelector('#visor-pdf'), e); },
  };
}
let pdfjsCarga = null;
function cargarPdfjs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  pdfjsCarga = pdfjsCarga || new Promise((res, rej) => {
    const sc = document.createElement('script'); sc.src = enApp('vendor/pdfjs/pdf.js');
    sc.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = enApp('vendor/pdfjs/pdf.worker.js'); res(window.pdfjsLib); };
    sc.onerror = () => { pdfjsCarga = null; rej(new Error('No se pudo cargar el visor de PDF.')); };
    document.head.appendChild(sc);
  });
  return pdfjsCarga;
}
async function bytesPdf(e) {
  const clave = `pdf-${e.archivoId}`;
  try { const b = await idbGet(clave); if (b) return b; } catch {}
  if (String(e.archivoId).startsWith('local-')) throw new Error('Este PDF ya no está en el dispositivo.');
  const buf = await G.descargarArchivo(e.archivoId);
  try { await idbSet(clave, buf); } catch {}
  return buf;
}
async function pintarPaginas(doc, cont, ancho) {
  cont.innerHTML = '';
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  for (let n = 1; n <= doc.numPages; n++) {
    if (!cont.isConnected) return;
    const pag = await doc.getPage(n);
    const base = pag.getViewport({ scale: 1 });
    const vp = pag.getViewport({ scale: (ancho / base.width) * dpr });
    const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height; c.className = 'pagina-pdf';
    c.style.width = '100%'; c.setAttribute('aria-label', `Página ${n} de ${doc.numPages}`);
    cont.appendChild(c);
    await pag.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
  }
}
async function montarVisor(visor, e) {
  if (!visor) return;
  const msg = (html) => { visor.innerHTML = `<p class="mini suave visor-msg">${html}</p>`; };
  let doc = null;
  const boton = () => { visor.innerHTML = '<p class="visor-msg"><button type="button" class="btn">Toca para cargar el PDF</button></p>'; visor.querySelector('button').addEventListener('click', (ev) => { ev.stopPropagation(); ctx.google().then(cargar).catch((x) => toast(x.message, { error: true })); }); };
  const cargar = async () => {
    try {
      msg('<span class="spinner" aria-hidden="true"></span> Cargando el PDF…');
      const [lib, buf] = await Promise.all([cargarPdfjs(), bytesPdf(e)]);
      doc = await lib.getDocument({ data: new Uint8Array(buf.slice ? buf.slice(0) : buf), isEvalSupported: false, enableXfa: false }).promise;
      await pintarPaginas(doc, visor, visor.clientWidth || 340);
    } catch (err) {
      console.warn(err);
      if (G.configurado() && !G.conectado()) boton();
      else msg(String(e.archivoId).startsWith('local-') ? 'Este PDF ya no está en el dispositivo.' : 'No se pudo mostrar el PDF. Ábrelo en Drive con el botón de abajo.');
    }
  };
  let enDispositivo = false; try { enDispositivo = Boolean(await idbGet(`pdf-${e.archivoId}`)); } catch {}
  if (enDispositivo || G.conectado() || !G.configurado()) cargar(); else boton();
  const abrir = () => { if (doc) pantallaCompleta(doc, e.titulo); };
  visor.addEventListener('click', abrir);
  visor.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); abrir(); } });
}
function pantallaCompleta(doc, titulo) {
  const capa = document.createElement('div'); capa.className = 'pdf-completo'; capa.setAttribute('role', 'dialog'); capa.setAttribute('aria-label', titulo);
  capa.innerHTML = `<div class="pdf-barra"><button type="button" class="icono-btn" data-z="-" aria-label="Alejar">−</button><span class="pdf-titulo">${esc(titulo)}</span><button type="button" class="icono-btn" data-z="+" aria-label="Acercar">+</button><button type="button" class="btn pequeno" data-cerrar-pdf>Cerrar</button></div><div class="pdf-hojas"><div class="pdf-lienzo"></div></div>`;
  document.body.appendChild(capa); document.body.style.overflow = 'hidden';
  const lienzo = capa.querySelector('.pdf-lienzo'); const hojas = capa.querySelector('.pdf-hojas');
  let zoom = 1;
  const pintar = () => { lienzo.style.width = `${zoom * 100}%`; pintarPaginas(doc, lienzo, hojas.clientWidth * zoom); };
  const cerrar = () => { capa.remove(); document.body.style.overflow = ''; document.removeEventListener('keydown', tecla); window.removeEventListener('hashchange', cerrar); };
  const tecla = (ev) => { if (ev.key === 'Escape') cerrar(); };
  document.addEventListener('keydown', tecla); window.addEventListener('hashchange', cerrar);
  capa.querySelector('[data-cerrar-pdf]').addEventListener('click', cerrar);
  capa.querySelectorAll('[data-z]').forEach((b) => b.addEventListener('click', () => { zoom = Math.max(1, Math.min(3, zoom + (b.dataset.z === '+' ? 0.5 : -0.5))); pintar(); }));
  pintar();
}

export const accionesBiblioteca = {
  'ap-subir': () => modalSubir(),
  'ap-tema': (b) => { tema = tema === b.dataset.v && !b.dataset.ir ? '' : b.dataset.v; if (b.dataset.ir) irA('#/biblioteca'); else ctx.render(); },
  'ap-editar': (b) => modalEditar(A().find((x) => x.id === b.dataset.id)),
  'ap-borrar': (b) => confirmar('¿Quitar de la Biblioteca?', G.configurado() ? 'Desaparece de la app. El PDF sigue en tu Drive, en la carpeta «Flexeo/Apuntes».' : 'Desaparece de la app y del dispositivo.', 'Quitar', () => {
    const e = A().find((x) => x.id === b.dataset.id);
    S.actualizar((s) => { s.apuntes = s.apuntes.filter((x) => x.id !== e.id); s.borrados = [...new Set([...(s.borrados || []), e.id])]; });
    irA('#/biblioteca');
  }),
};
