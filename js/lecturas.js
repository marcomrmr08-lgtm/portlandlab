// Lecturas: la bibliografía, unida al Diario. Cada lectura guarda su estado, por dónde vas,
// citas y apuntes, y reúne las reflexiones del diario y las fichas del Hexaflex que salen de ella.
import * as S from './store.js';
import { PROCESOS, PILAR, proceso } from './procesos.js';
import { esc, hoyISO, fmtCorta, toast, abrirModal, cerrarModal, icon } from './ui.js';
import { ctx, app, irA, volver, seg, leerForm, confirmar, vNoEncontrado as noEncontrado } from './comun.js';

const vNoEncontrado = () => noEncontrado('#/lecturas');
export const ESTADOS = [['curso', 'Leyendo'], ['pendiente', 'Pendientes'], ['leido', 'Leídas']];
export const TIPOS_LECTURA = ['Libro', 'Artículo', 'Capítulo', 'Otro'];
const L = () => S.datos().biblio;
export const lectura = (id) => L().find((b) => b.id === id);
const chips = (ks = []) => ks.filter((k) => proceso(k)).map((k) => `<span class="insignia pilar-${PILAR[k]}">${esc(proceso(k).nombre)}</span>`).join('');
const enlaceSeguro = (u) => (/^https?:\/\/[^\s"'<>]+$/i.test(u || '') ? u : '');
const reflexiones = (id) => S.datos().diario.filter((e) => e.libroId === id).sort((a, b) => b.fecha.localeCompare(a.fecha));
const fichas = (id) => S.datos().hexaflex.fichas.filter((f) => f.libroId === id);

let filtro = 'curso';
let q = '';
// Lista (se muestra dentro de la pestaña Diario)
export function htmlLecturas() {
  const busq = q.trim().toLowerCase();
  const lista = L().filter((b) => b.estado === filtro && (!busq || [b.titulo, b.autor, b.notas].join(' ').toLowerCase().includes(busq)));
  return `
    <div class="chips" role="group" aria-label="Estado">${ESTADOS.map(([k, t]) => `<button class="chip ${filtro === k ? 'activo' : ''}" data-act="lec-filtro" data-v="${k}" aria-pressed="${filtro === k}">${t} · ${L().filter((b) => b.estado === k).length}</button>`).join('')}</div>
    ${L().length > 4 ? `<div class="campo"><label for="lec-buscar" class="oculto">Buscar lecturas</label><input type="search" id="lec-buscar" placeholder="Buscar por título o autor…" value="${esc(q)}"></div>` : ''}
    <div class="seccion">${lista.map(tarjeta).join('') || `<p class="vacio">${filtro === 'curso' ? 'No estás leyendo nada ahora. Empieza una lectura pendiente o añade una nueva.' : filtro === 'leido' ? 'Aún no has terminado ninguna lectura.' : 'No hay lecturas pendientes.'}</p>`}</div>`;
}
export function montarLecturas(r) {
  const b = r.querySelector('#lec-buscar');
  b?.addEventListener('input', () => { q = b.value; const pos = b.selectionStart; ctx.render(); const nb = app().querySelector('#lec-buscar'); nb?.focus(); nb?.setSelectionRange(pos, pos); });
}
function tarjeta(b) {
  const nR = reflexiones(b.id).length; const nC = (b.citas || []).length; const nF = fichas(b.id).length;
  const datos = [nC && `${nC} cita${nC === 1 ? '' : 's'}`, nR && `${nR} reflexi${nR === 1 ? 'ón' : 'ones'}`, nF && `${nF} ficha${nF === 1 ? '' : 's'}`].filter(Boolean).join(' · ');
  return `<a href="#/lecturas/l/${encodeURIComponent(b.id)}" class="item entrada">
    <span class="fila-entre"><span class="insignia tipo-lectura">${esc(b.tipo || 'Libro')}</span>${b.anio ? `<span class="mini suave">${esc(b.anio)}</span>` : ''}</span>
    <span class="entrada-titulo">${esc(b.titulo)}</span>
    ${b.autor ? `<span class="item-sub">${esc(b.autor)}</span>` : ''}
    ${b.estado === 'curso' && b.progreso ? `<span class="pequeno"><span class="suave">Voy por:</span> <b>${esc(b.progreso)}</b></span>` : ''}
    ${datos ? `<span class="mini suave">${datos}</span>` : ''}</a>`;
}

// Ficha de una lectura
export function vLectura(id) {
  const b = lectura(id); if (!b) return vNoEncontrado();
  const url = enlaceSeguro(b.enlace);
  const refl = reflexiones(b.id); const fs = fichas(b.id);
  const citas = [...(b.citas || [])].reverse();
  return {
    html: `<div class="pantalla sin-nav">${volver('#/lecturas', 'Lectura', `<button class="btn texto" data-act="lec-editar" data-id="${esc(b.id)}">${icon('editar', 18)}Editar</button>`)}
    <div class="item-texto"><span class="tipo suave">${esc(b.tipo || 'Libro')}${b.anio ? ` · ${esc(b.anio)}` : ''}</span><h1 class="titulo" style="font-size:24px">${esc(b.titulo)}</h1>${b.autor ? `<span class="suave">${esc(b.autor)}</span>` : ''}</div>
    ${(b.procesos || []).length ? `<span class="insignias">${chips(b.procesos)}</span>` : ''}
    ${url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" class="pequeno" style="font-weight:700;display:flex;gap:6px;align-items:center">${icon('externo', 16)}Abrir enlace</a>` : ''}

    <section class="tarjeta">
      ${seg('lec-estado', ESTADOS.map(([k, t]) => [k, t.replace('Pendientes', 'Pendiente').replace('Leídas', 'Leída')]), b.estado)}
      ${b.estado !== 'pendiente' ? `<div class="campo"><label for="lec-prog">Por dónde voy</label><input type="text" id="lec-prog" value="${esc(b.progreso)}" placeholder="p. ej. parte 3, capítulo 8" maxlength="80"></div>` : ''}
    </section>

    <div class="fila-entre"><h2 class="etiqueta-grupo" style="margin:6px 0 -4px 2px">Citas y apuntes</h2></div>
    <form id="f-cita" class="tarjeta">
      <label for="c-texto" class="oculto">Nueva cita o apunte</label><textarea id="c-texto" name="texto" rows="3" placeholder="Copia una cita o apunta una idea del texto…" required></textarea>
      <div class="fila-entre" style="gap:10px"><div class="campo" style="flex:1"><label for="c-pag" class="oculto">Página</label><input type="text" id="c-pag" name="pagina" placeholder="Página (opcional)" maxlength="20"></div><button class="btn primario">Guardar</button></div>
    </form>
    <div class="seccion">${citas.map((c) => `<section class="tarjeta cita"><p>${esc(c.texto)}</p><div class="fila-entre"><span class="mini suave">${c.pagina ? `p. ${esc(c.pagina)} · ` : ''}${esc(fmtCorta(c.fecha))}</span>
      <span style="display:flex;gap:4px"><button class="icono-btn peq" data-act="lec-cita-diario" data-id="${esc(b.id)}" data-c="${esc(c.id)}" aria-label="Escribir una reflexión sobre esta cita">${icon('diario', 16)}</button><button class="icono-btn peq" data-act="lec-cita-borrar" data-id="${esc(b.id)}" data-c="${esc(c.id)}" aria-label="Borrar esta cita">${icon('papelera', 16)}</button></span></div></section>`).join('')}</div>

    <h2 class="etiqueta-grupo">Reflexiones en el diario</h2>
    <div class="seccion">${refl.map((e) => `<a href="#/diario/e/${encodeURIComponent(e.id)}" class="item"><span class="item-texto"><span class="item-titulo">${esc(e.titulo || e.texto.slice(0, 70))}</span><span class="item-sub">${esc(fmtCorta(e.fecha))}</span></span>${icon('sig', 18)}</a>`).join('')}</div>
    <a href="#/diario/nueva?tipo=reflexion&libro=${encodeURIComponent(b.id)}" class="btn">${icon('mas', 18)}Escribir una reflexión sobre esta lectura</a>

    ${fs.length ? `<h2 class="etiqueta-grupo">Fichas del Hexaflex</h2><div class="seccion">${fs.map((f) => `<a href="#/hexaflex/ficha/${encodeURIComponent(f.id)}" class="item"><span class="item-texto"><span class="item-titulo">${esc(f.nombre)}</span><span class="item-sub">${esc(f.tipo)}${f.pagina ? ` · p. ${esc(f.pagina)}` : ''}</span></span>${icon('sig', 18)}</a>`).join('')}</div>` : ''}
    ${b.notas ? `<h2 class="etiqueta-grupo">Notas</h2><section class="tarjeta"><p class="lectura" style="font-size:15px">${esc(b.notas)}</p></section>` : ''}
    </div>`,
    mount(r) {
      r.querySelectorAll('input[name="lec-estado"]').forEach((el) => el.addEventListener('change', () => {
        S.actualizar(() => { b.estado = el.value; if (el.value === 'leido') b.terminado = hoyISO(); });
        filtro = el.value; toast(el.value === 'leido' ? '¡Lectura terminada!' : el.value === 'curso' ? 'Lectura en curso.' : 'Lectura pendiente.'); ctx.render();
      }));
      const p = r.querySelector('#lec-prog');
      p?.addEventListener('change', () => { S.actualizar(() => { b.progreso = p.value.trim(); }); toast('Guardado.', { ms: 1500 }); });
      r.querySelector('#f-cita').addEventListener('submit', (e) => {
        e.preventDefault(); const v = leerForm(e.target);
        S.actualizar(() => { (b.citas = b.citas || []).push({ id: S.nuevoId(), texto: v.texto.trim(), pagina: v.pagina.trim(), fecha: hoyISO() }); });
        toast('Cita guardada.', { ms: 2000 }); ctx.render();
      });
    },
  };
}

function modalLectura(id) {
  const b = id ? lectura(id) : null;
  abrirModal(`<h2>${b ? 'Editar lectura' : 'Nueva lectura'}</h2>
  <form id="f-lec" class="seccion">
    <div class="campo"><label for="l-tit">Título</label><input type="text" id="l-tit" name="titulo" required maxlength="200" value="${esc(b?.titulo)}"></div>
    <div class="campo"><label for="l-aut">Autor/es</label><input type="text" id="l-aut" name="autor" maxlength="200" value="${esc(b?.autor)}"></div>
    <div class="dos-col"><div class="campo"><label for="l-tipo">Tipo</label><select id="l-tipo" name="tipo">${TIPOS_LECTURA.map((t) => `<option ${t === (b?.tipo || 'Libro') ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <div class="campo"><label for="l-anio">Año</label><input type="text" id="l-anio" name="anio" inputmode="numeric" maxlength="4" value="${esc(b?.anio)}"></div></div>
    <div class="campo"><span class="etiqueta">Estado</span>${seg('estado', ESTADOS.map(([k, t]) => [k, t.replace('Pendientes', 'Pendiente').replace('Leídas', 'Leída')]), b?.estado || 'pendiente')}</div>
    <div class="campo"><label for="l-url">Enlace (opcional)</label><input type="text" inputmode="url" autocomplete="off" id="l-url" name="enlace" value="${esc(b?.enlace)}" placeholder="https://"></div>
    <div class="campo"><span class="etiqueta">Procesos que trata</span><div class="chips">${PROCESOS.map((p) => `<input type="checkbox" id="lp-${p.k}" name="procesos" value="${p.k}" ${(b?.procesos || []).includes(p.k) ? 'checked' : ''}><label for="lp-${p.k}">${esc(p.nombre)}</label>`).join('')}</div></div>
    <div class="campo"><label for="l-not">Notas o resumen</label><textarea id="l-not" name="notas" rows="3">${esc(b?.notas)}</textarea></div>
    <div class="botones"><button type="button" class="btn" data-cerrar>Cancelar</button><button class="btn primario">Guardar</button></div>
    ${b ? '<button type="button" class="btn texto" id="b-del-lec" style="color:var(--error)">Eliminar lectura</button>' : ''}
  </form>`, (d) => {
    d.querySelector('#f-lec').addEventListener('submit', (e) => {
      e.preventDefault(); const v = leerForm(e.target);
      if (v.enlace && !enlaceSeguro(v.enlace.trim())) { toast('El enlace tiene que empezar por https://', { error: true }); return; }
      const datos = { titulo: v.titulo.trim(), autor: v.autor.trim(), tipo: v.tipo, anio: v.anio.trim(), estado: v.estado, enlace: v.enlace.trim(), procesos: [].concat(v.procesos || []), notas: v.notas.trim() };
      let nuevoId = null;
      S.actualizar((s) => { if (b) Object.assign(b, datos); else { nuevoId = S.nuevoId(); s.biblio.push({ id: nuevoId, progreso: '', citas: [], ...datos }); } });
      filtro = v.estado; cerrarModal();
      if (nuevoId) irA(`#/lecturas/l/${encodeURIComponent(nuevoId)}`); else ctx.render();
    });
    d.querySelector('#b-del-lec')?.addEventListener('click', () => confirmar('¿Eliminar esta lectura?', 'Se borran sus citas. Las reflexiones del diario y las fichas se conservan.', 'Eliminar', () => {
      S.actualizar((s) => { s.biblio = s.biblio.filter((x) => x.id !== b.id); s.borrados = [...new Set([...(s.borrados || []), b.id])]; });
      irA('#/lecturas');
    }));
  });
}

export const accionesLecturas = {
  'lec-filtro': (b) => { filtro = b.dataset.v; ctx.render(); },
  'lec-nueva': () => modalLectura(null),
  'lec-editar': (b) => modalLectura(b.dataset.id),
  'lec-cita-borrar': (b) => confirmar('¿Borrar esta cita?', 'Se elimina de la lectura.', 'Borrar', () => {
    const l = lectura(b.dataset.id); S.actualizar(() => { l.citas = (l.citas || []).filter((c) => c.id !== b.dataset.c); }); ctx.render();
  }),
  'lec-cita-diario': (b) => irA(`#/diario/nueva?tipo=reflexion&libro=${encodeURIComponent(b.dataset.id)}&cita=${encodeURIComponent(b.dataset.c)}`),
};
