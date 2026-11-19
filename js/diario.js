// Diario: notas, ideas y reflexiones rápidas. Cada entrada puede enlazarse a una lectura de la Biblioteca.
// Se guardan con el resto de tus datos (este dispositivo y tu Drive).
import * as S from './store.js';
import { PROCESOS, PILAR, proceso } from './procesos.js';
import { esc, hoyISO, fmtFecha, fmtCorta, nombreMes, toast, icon } from './ui.js';
import { ctx, app, irA, nav, volver, seg, leerForm, confirmar, vNoEncontrado as noEncontrado } from './comun.js';
import { lectura } from './lecturas.js';

const vNoEncontrado = () => noEncontrado('#/diario');
export const TIPOS = { nota: 'Nota', idea: 'Idea', reflexion: 'Reflexión' };
const D = () => S.datos().diario;
const entrada = (id) => D().find((e) => e.id === id);
const porFecha = (a, b) => (b.fecha + (b.creado || '')).localeCompare(a.fecha + (a.creado || ''));
const pildora = (t) => `<span class="insignia tipo-${t}">${esc(TIPOS[t] || 'Nota')}</span>`;
const chips = (ks = []) => ks.filter((k) => proceso(k)).map((k) => `<span class="insignia pilar-${PILAR[k]}">${esc(proceso(k).nombre)}</span>`).join('');
const estrategia = (id) => (S.datos().estrategias || []).find((x) => x.id === id);

let filtro = { tipo: 'todo', q: '' };

let rapido = { tipo: 'nota', texto: '' }; // lo que se está escribiendo arriba, para no perderlo al cambiar de filtro
export function vDiario() {
  const q = filtro.q.trim().toLowerCase();
  const lista = [...D()].sort(porFecha).filter((e) => (filtro.tipo === 'todo' || e.tipo === filtro.tipo)
    && (!q || [e.titulo, e.texto, lectura(e.libroId)?.titulo, ...(e.procesos || []).map((k) => proceso(k)?.nombre)].join(' ').toLowerCase().includes(q)));
  const meses = [];
  for (const e of lista) { const m = (e.fecha || '').slice(0, 7); if (!meses.length || meses.at(-1).m !== m) meses.push({ m, xs: [] }); meses.at(-1).xs.push(e); }
  const chip = (v, t) => `<button class="chip ${filtro.tipo === v ? 'activo' : ''}" data-act="dia-filtro" data-v="${v}" aria-pressed="${filtro.tipo === v}">${t}</button>`;
  return {
    html: `<div class="pantalla">
    <div class="item-texto"><h1 class="titulo">Diario</h1><span class="suave pequeno">Notas, ideas y reflexiones rápidas</span></div>
    <form id="f-rapido" class="tarjeta rapido">
      <label for="r-texto" class="oculto">Escribe una nota, idea o reflexión</label>
      <textarea id="r-texto" rows="3" placeholder="¿Qué se te ha pasado por la cabeza?">${esc(rapido.texto)}</textarea>
      <div class="fila-entre" style="gap:8px;flex-wrap:wrap">${seg('r-tipo', Object.entries(TIPOS), rapido.tipo)}
        <span style="display:flex;gap:6px;margin-left:auto"><a href="#/diario/nueva?tipo=${rapido.tipo}" class="btn texto pequeno" data-act="dia-mas">Más opciones</a><button class="btn primario pequeno">Guardar</button></span></div>
    </form>
    ${D().length ? `<div class="chips" role="group" aria-label="Tipo">${chip('todo', 'Todo')}${chip('nota', 'Notas')}${chip('idea', 'Ideas')}${chip('reflexion', 'Reflexiones')}</div>
    ${D().length > 5 ? `<div class="campo"><label for="dia-buscar" class="oculto">Buscar en el diario</label><input type="search" id="dia-buscar" placeholder="Buscar…" value="${esc(filtro.q)}"></div>` : ''}` : ''}
    ${meses.map(({ m, xs }) => `<h2 class="mes-cab">${m ? esc(nombreMes(m)) : 'Sin fecha'}</h2><div class="seccion">${xs.map(tarjeta).join('')}</div>`).join('')
      || (D().length ? '<p class="vacio">No hay entradas que coincidan.</p>' : '<p class="vacio">Escribe arriba tu primera nota. Sin datos que identifiquen a pacientes.</p>')}
    </div>${nav('diario')}`,
    mount(r) {
      const f = r.querySelector('#f-rapido'); const t = f.querySelector('#r-texto');
      t.addEventListener('input', () => { rapido.texto = t.value; });
      f.querySelectorAll('input[name="r-tipo"]').forEach((el) => el.addEventListener('change', () => { rapido.tipo = el.value; f.querySelector('[data-act="dia-mas"]').href = `#/diario/nueva?tipo=${el.value}`; }));
      f.addEventListener('submit', (ev) => {
        ev.preventDefault(); const texto = t.value.trim();
        if (!texto) { t.focus(); return; }
        S.actualizar((s) => { s.diario.push({ id: S.nuevoId(), tipo: rapido.tipo, fecha: hoyISO(), titulo: '', texto, procesos: [], libroId: '', creado: new Date().toISOString() }); });
        rapido = { tipo: rapido.tipo, texto: '' }; toast('Guardado en tu diario.', { ms: 1800 }); ctx.render();
      });
      const b = r.querySelector('#dia-buscar');
      b?.addEventListener('input', () => { filtro.q = b.value; const pos = b.selectionStart; ctx.render(); const nb = app().querySelector('#dia-buscar'); nb?.focus(); nb?.setSelectionRange(pos, pos); });
    },
  };
}
function tarjeta(e) {
  const lib = lectura(e.libroId); const est = estrategia(e.estrategiaId);
  return `<a href="#/diario/e/${encodeURIComponent(e.id)}" class="item entrada">
    <span class="fila-entre">${pildora(e.tipo)}<span class="mini suave">${esc(fmtCorta(e.fecha))}</span></span>
    ${e.titulo ? `<span class="entrada-titulo">${esc(e.titulo)}</span>` : ''}
    ${e.texto ? `<span class="entrada-extracto">${esc(e.texto)}</span>` : ''}
    ${lib || est ? `<span class="mini suave" style="display:flex;gap:5px;align-items:center">${icon(lib ? 'guia' : 'pareja', 14)}${esc(lib ? lib.titulo : est.titulo)}</span>` : ''}
    ${(e.procesos || []).length ? `<span class="insignias">${chips(e.procesos)}</span>` : ''}</a>`;
}

export function vEntrada(id) {
  const e = entrada(id); if (!e) return vNoEncontrado();
  const lib = lectura(e.libroId); const est = estrategia(e.estrategiaId);
  return {
    html: `<div class="pantalla sin-nav">${volver('#/diario', TIPOS[e.tipo] || 'Entrada', `<a href="#/diario/editar/${encodeURIComponent(e.id)}" class="btn texto">${icon('editar', 18)}Editar</a>`)}
    <div class="item-texto"><span class="tipo suave">${esc(fmtFecha(e.fecha))}</span>${e.titulo ? `<h1 class="titulo">${esc(e.titulo)}</h1>` : ''}</div>
    ${(e.procesos || []).length ? `<span class="insignias">${chips(e.procesos)}</span>` : ''}
    <section class="tarjeta"><p class="lectura">${esc(e.texto) || '<span class="suave">Sin texto.</span>'}</p></section>
    ${lib ? `<a href="#/lecturas/l/${encodeURIComponent(lib.id)}" class="item">${icon('guia', 20)}<span class="item-texto"><span class="item-sub">Lectura</span><span class="item-titulo">${esc(lib.titulo)}</span></span>${icon('sig', 18)}</a>` : ''}
    ${est ? `<a href="#/roleplay/e/${encodeURIComponent(est.id)}" class="item">${icon('pareja', 20)}<span class="item-texto"><span class="item-sub">Role play</span><span class="item-titulo">${esc(est.titulo)}</span></span>${icon('sig', 18)}</a>` : ''}
    </div>`,
  };
}

const borrador = {};
export function vEditar(id, params) {
  const nueva = id === 'nueva';
  let e;
  if (nueva) {
    const libroId = lectura(params.get('libro'))?.id || '';
    const cita = libroId ? (lectura(libroId).citas || []).find((c) => c.id === params.get('cita')) : null;
    const clave = `${libroId}|${cita?.id || ''}`;
    if (!borrador.e || borrador.clave !== clave) {
      borrador.clave = clave;
      borrador.e = { id: S.nuevoId(), tipo: TIPOS[params.get('tipo')] ? params.get('tipo') : 'reflexion', fecha: hoyISO(), titulo: '', texto: cita ? `«${cita.texto}»${cita.pagina ? ` (p. ${cita.pagina})` : ''}\n\n` : '', procesos: [...(lectura(libroId)?.procesos || [])], libroId };
    }
    if (params.get('rapido') === '1' && rapido.texto && !borrador.e.texto) { borrador.e.texto = rapido.texto; rapido = { tipo: rapido.tipo, texto: '' }; }
    e = borrador.e;
  } else e = entrada(id);
  if (!e) return vNoEncontrado();
  const libros = [...S.datos().biblio].sort((a, b) => (a.estado === 'curso' ? -1 : 0) - (b.estado === 'curso' ? -1 : 0));
  return {
    html: `<div class="pantalla sin-nav">${volver(nueva ? '#/diario' : `#/diario/e/${encodeURIComponent(e.id)}`, nueva ? 'Nueva entrada' : 'Editar entrada')}
    <form id="f-dia" class="seccion">
      ${seg('tipo', Object.entries(TIPOS), e.tipo)}
      <div class="campo"><label for="d-fecha">Fecha</label><input type="date" id="d-fecha" name="fecha" required value="${esc(e.fecha)}"></div>
      <div class="campo"><label for="d-titulo">Título <span class="suave" style="font-weight:400">(opcional)</span></label><input type="text" id="d-titulo" name="titulo" maxlength="140" value="${esc(e.titulo)}" placeholder="En pocas palabras"></div>
      <div class="campo"><label for="d-texto">${{ idea: 'Tu idea', reflexion: 'Tu reflexión', nota: 'Tu nota' }[e.tipo]}</label><textarea id="d-texto" name="texto" class="texto-diario" rows="10" placeholder="Escribe con libertad. Sin datos que identifiquen a pacientes.">${esc(e.texto)}</textarea></div>
      <div class="campo"><label for="d-libro">Lectura de la Biblioteca <span class="suave" style="font-weight:400">(opcional)</span></label><select id="d-libro" name="libroId"><option value="">Ninguna</option>${libros.map((b) => `<option value="${esc(b.id)}" ${b.id === e.libroId ? 'selected' : ''}>${esc(b.titulo.slice(0, 60))}</option>`).join('')}</select></div>
      <div class="campo"><span class="etiqueta">Relacionado con <span class="suave" style="font-weight:400">(opcional)</span></span><div class="chips">${PROCESOS.map((p) => `<input type="checkbox" id="dp-${p.k}" name="procesos" value="${p.k}" ${(e.procesos || []).includes(p.k) ? 'checked' : ''}><label for="dp-${p.k}">${esc(p.nombre)}</label>`).join('')}</div></div>
      <button class="btn primario grande">Guardar</button>
      ${!nueva ? `<button type="button" class="btn peligro" id="b-borrar-dia">${icon('papelera', 18)}Eliminar entrada</button>` : ''}
    </form></div>`,
    mount(r) {
      const form = r.querySelector('#f-dia');
      const leer = () => { const v = leerForm(form); return { tipo: v.tipo, fecha: v.fecha, titulo: (v.titulo || '').trim(), texto: (v.texto || '').trim(), libroId: v.libroId || '', procesos: [].concat(v.procesos || []) }; };
      // El borrador de una entrada nueva se conserva si sales sin guardar (mientras la app siga abierta)
      if (nueva) form.addEventListener('input', () => Object.assign(e, leer(), { texto: form.querySelector('#d-texto').value }));
      form.addEventListener('submit', (ev) => {
        ev.preventDefault(); const datos = { ...leer(), editado: new Date().toISOString() };
        if (!datos.titulo && !datos.texto) { toast('Escribe al menos un título o un texto.', { error: true }); return; }
        S.actualizar((s) => { if (nueva) { s.diario.push({ ...e, ...datos, creado: new Date().toISOString() }); delete borrador.e; } else Object.assign(e, datos); });
        toast('Guardado.'); irA(`#/diario/e/${encodeURIComponent(e.id)}`);
      });
      r.querySelector('#b-borrar-dia')?.addEventListener('click', () => confirmar('¿Eliminar esta entrada?', 'Se borra de tu diario.', 'Eliminar', () => {
        S.actualizar((s) => { s.diario = s.diario.filter((x) => x.id !== e.id); s.borrados = [...new Set([...(s.borrados || []), e.id])]; });
        toast('Entrada eliminada.'); irA('#/diario');
      }));
    },
  };
}

export const accionesDiario = {
  'dia-filtro': (b) => { filtro.tipo = b.dataset.v; ctx.render(); },
  'dia-mas': () => irA(`#/diario/nueva?tipo=${rapido.tipo}&rapido=1`),
};
