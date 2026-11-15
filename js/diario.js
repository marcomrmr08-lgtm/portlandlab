// Diario: ideas y reflexiones sueltas. Se guardan con el resto de tus datos (este dispositivo y tu Drive).
import * as S from './store.js';
import { PROCESOS, PILAR, proceso } from './procesos.js';
import { esc, hoyISO, fmtFecha, fmtCorta, nombreMes, toast, icon } from './ui.js';
import { ctx, app, irA, nav, volver, seg, leerForm, confirmar, vNoEncontrado as noEncontrado } from './comun.js';

const vNoEncontrado = () => noEncontrado('#/diario');
export const TIPOS = { idea: 'Idea', reflexion: 'Reflexión' };
const D = () => S.datos().diario;
const entrada = (id) => D().find((e) => e.id === id);
const porFecha = (a, b) => (b.fecha + (b.creado || '')).localeCompare(a.fecha + (a.creado || ''));
const pildora = (t) => `<span class="insignia tipo-${t}">${esc(TIPOS[t] || 'Nota')}</span>`;
const chips = (ks = []) => ks.filter((k) => proceso(k)).map((k) => `<span class="insignia pilar-${PILAR[k]}">${esc(proceso(k).nombre)}</span>`).join('');

let filtro = { tipo: 'todo', q: '' };

export function vDiario() {
  const q = filtro.q.trim().toLowerCase();
  const lista = [...D()].sort(porFecha).filter((e) => (filtro.tipo === 'todo' || e.tipo === filtro.tipo)
    && (!q || [e.titulo, e.texto, ...(e.procesos || []).map((k) => proceso(k)?.nombre)].join(' ').toLowerCase().includes(q)));
  // Agrupado por mes
  const meses = [];
  for (const e of lista) { const m = (e.fecha || '').slice(0, 7); if (!meses.length || meses.at(-1).m !== m) meses.push({ m, xs: [] }); meses.at(-1).xs.push(e); }
  const tab = (v, t) => `<button class="seg-btn ${filtro.tipo === v ? 'activo' : ''}" data-act="dia-filtro" data-v="${v}" role="tab" aria-selected="${filtro.tipo === v}">${t}</button>`;
  return {
    html: `<div class="pantalla">
    <div class="item-texto"><h1 class="titulo">Diario</h1><span class="suave pequeno">Ideas y reflexiones de tus prácticas</span></div>
    ${D().length ? `<div class="segmentado" role="tablist">${tab('todo', 'Todo')}${tab('idea', 'Ideas')}${tab('reflexion', 'Reflexiones')}</div>
    <div class="campo"><label for="dia-buscar" class="oculto">Buscar en el diario</label><input type="search" id="dia-buscar" placeholder="Buscar…" value="${esc(filtro.q)}"></div>` : ''}
    ${meses.map(({ m, xs }) => `<h2 class="mes-cab">${m ? esc(nombreMes(m)) : 'Sin fecha'}</h2><div class="seccion">${xs.map(tarjeta).join('')}</div>`).join('')
      || (D().length ? '<p class="vacio">No hay entradas que coincidan.</p>'
        : `<div class="tarjeta" style="align-items:center;text-align:center;padding:32px 18px">${icon('diario', 28)}<b>Tu diario está vacío</b><p class="pequeno suave" style="line-height:1.5;max-width:30em">Apunta aquí ideas que te surjan, preguntas para supervisión o lo que te llevas de una sesión.</p>
          <div class="botones" style="width:100%"><a href="#/diario/nueva?tipo=idea" class="btn">${icon('mas', 18)}Idea</a><a href="#/diario/nueva?tipo=reflexion" class="btn">${icon('mas', 18)}Reflexión</a></div></div>`)}
    </div><a href="#/diario/nueva" class="fab">${icon('mas', 22)}Nueva entrada</a>${nav('diario')}`,
    mount(r) {
      const b = r.querySelector('#dia-buscar');
      b?.addEventListener('input', () => { filtro.q = b.value; const pos = b.selectionStart; ctx.render(); const nb = app().querySelector('#dia-buscar'); nb?.focus(); nb?.setSelectionRange(pos, pos); });
    },
  };
}
function tarjeta(e) {
  return `<a href="#/diario/e/${encodeURIComponent(e.id)}" class="item entrada">
    <span class="fila-entre">${pildora(e.tipo)}<span class="mini suave">${esc(fmtCorta(e.fecha))}</span></span>
    ${e.titulo ? `<span class="entrada-titulo">${esc(e.titulo)}</span>` : ''}
    ${e.texto ? `<span class="entrada-extracto">${esc(e.texto)}</span>` : ''}
    ${(e.procesos || []).length ? `<span class="insignias">${chips(e.procesos)}</span>` : ''}</a>`;
}

export function vEntrada(id) {
  const e = entrada(id); if (!e) return vNoEncontrado();
  return {
    html: `<div class="pantalla sin-nav">${volver('#/diario', TIPOS[e.tipo] || 'Entrada', `<a href="#/diario/editar/${encodeURIComponent(e.id)}" class="btn texto">${icon('editar', 18)}Editar</a>`)}
    <div class="item-texto"><span class="tipo suave">${esc(fmtFecha(e.fecha))}</span>${e.titulo ? `<h1 class="titulo">${esc(e.titulo)}</h1>` : ''}</div>
    ${(e.procesos || []).length ? `<span class="insignias">${chips(e.procesos)}</span>` : ''}
    <section class="tarjeta"><p class="lectura">${esc(e.texto) || '<span class="suave">Sin texto.</span>'}</p></section>
    </div>`,
  };
}

const borrador = {};
export function vEditar(id, params) {
  const nueva = id === 'nueva';
  const e = nueva ? (borrador.e = borrador.e || { id: S.nuevoId(), tipo: TIPOS[params.get('tipo')] ? params.get('tipo') : 'reflexion', fecha: hoyISO(), titulo: '', texto: '', procesos: [] }) : entrada(id);
  if (!e) return vNoEncontrado();
  return {
    html: `<div class="pantalla sin-nav">${volver(nueva ? '#/diario' : `#/diario/e/${encodeURIComponent(e.id)}`, nueva ? 'Nueva entrada' : 'Editar entrada')}
    <form id="f-dia" class="seccion">
      ${seg('tipo', Object.entries(TIPOS), e.tipo)}
      <div class="campo"><label for="d-fecha">Fecha</label><input type="date" id="d-fecha" name="fecha" required value="${esc(e.fecha)}"></div>
      <div class="campo"><label for="d-titulo">Título <span class="suave" style="font-weight:400">(opcional)</span></label><input type="text" id="d-titulo" name="titulo" maxlength="140" value="${esc(e.titulo)}" placeholder="En pocas palabras"></div>
      <div class="campo"><label for="d-texto">${e.tipo === 'idea' ? 'Tu idea' : 'Tu reflexión'}</label><textarea id="d-texto" name="texto" class="texto-diario" rows="10" placeholder="Escribe con libertad. Sin datos que identifiquen a pacientes.">${esc(e.texto)}</textarea></div>
      <div class="campo"><span class="etiqueta">Relacionado con <span class="suave" style="font-weight:400">(opcional)</span></span><div class="chips">${PROCESOS.map((p) => `<input type="checkbox" id="dp-${p.k}" name="procesos" value="${p.k}" ${(e.procesos || []).includes(p.k) ? 'checked' : ''}><label for="dp-${p.k}">${esc(p.nombre)}</label>`).join('')}</div></div>
      <button class="btn primario grande">Guardar</button>
      ${!nueva ? `<button type="button" class="btn peligro" id="b-borrar-dia">${icon('papelera', 18)}Eliminar entrada</button>` : ''}
    </form></div>`,
    mount(r) {
      const form = r.querySelector('#f-dia');
      // El borrador de una entrada nueva se conserva si sales sin guardar (mientras la app siga abierta)
      if (nueva) form.addEventListener('input', () => { const v = leerForm(form); Object.assign(e, { tipo: v.tipo, fecha: v.fecha, titulo: v.titulo, texto: v.texto, procesos: [].concat(v.procesos || []) }); });
      form.addEventListener('submit', (ev) => {
        ev.preventDefault(); const v = leerForm(form);
        if (!v.titulo.trim() && !v.texto.trim()) { toast('Escribe al menos un título o un texto.', { error: true }); return; }
        const datos = { tipo: v.tipo, fecha: v.fecha, titulo: v.titulo.trim(), texto: v.texto.trim(), procesos: [].concat(v.procesos || []), editado: new Date().toISOString() };
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
};
