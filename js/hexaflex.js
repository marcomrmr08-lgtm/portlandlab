// Hexaflex: teoría de los seis procesos, banco de fichas y práctica en tres niveles (escrito, audio y role play).
// Portado de Luria Lab: los mismos datos y pantallas, para poder mejorarlo aquí.
import * as S from './store.js';
import * as G from './google.js';
import { CONFIG } from './config.js';
import { TEORIA, MODELO } from './hexaflexBase.js';
import { ILUSTRACION } from './ilustraciones.js';
import { PROCESOS, TIPOS_FICHA, PILAR, proceso } from './procesos.js';
import { esc, hoyISO, fmtCorta, fmtNum, toast, abrirModal, cerrarModal, conCarga, idbGet, idbSet, icon } from './ui.js';
import { ctx, app, irA, nav, volver, seg, leerForm, confirmar, vNoEncontrado as noEncontrado } from './comun.js';

const RAIZ = CONFIG.CARPETA_RAIZ;
const vNoEncontrado = () => noEncontrado('#/hexaflex');

const HX = () => S.datos().hexaflex;
const fichasDe = (k) => HX().fichas.filter((f) => (f.procesos || []).includes(k));
const libro = (id) => S.datos().biblio.find((b) => b.id === id);
// Los tres niveles de práctica de una ficha
const nivelesFicha = (f) => ({ escrito: Boolean(f.miVersion), audio: (f.audios || []).length > 0, roleplay: (f.videos || []).length > 0 || Boolean(f.exp?.rp) });
function nivelesProceso(k) {
  const n = { escrito: false, audio: false, roleplay: false };
  for (const f of fichasDe(k)) { const x = nivelesFicha(f); n.escrito ||= x.escrito; n.audio ||= x.audio; n.roleplay ||= x.roleplay; }
  return n;
}
const NIVELES = [['escrito', 'Escrito'], ['audio', 'Audio'], ['roleplay', 'Role play']];
const puntosNivel = (n, clase = '') => `<span class="niveles ${clase}" aria-label="Niveles: ${NIVELES.map(([k, t]) => `${t} ${n[k] ? 'hecho' : 'pendiente'}`).join(', ')}">${NIVELES.map(([k]) => `<i class="${n[k] ? 'on' : ''}"></i>`).join('')}</span>`;
function autoguardarNotas(raiz, obtener, poner) {
  raiz.querySelectorAll('[data-nota]').forEach((el) => el.addEventListener('change', () => {
    S.actualizar(() => poner(el.dataset.nota, el.value.trim()));
    const a = raiz.querySelector('.guardado'); if (a) { a.textContent = 'Guardado'; setTimeout(() => { a.textContent = ''; }, 1500); }
  }));
}
const tarjetaFicha = (f) => `<a href="#/hexaflex/ficha/${encodeURIComponent(f.id)}" class="item" style="flex-direction:column;align-items:stretch;gap:8px">
  <span class="fila-entre"><span class="tipo c-morado">${esc(f.tipo || 'Ficha')}</span>${puntosNivel(nivelesFicha(f))}</span>
  <span style="font-size:17px;font-weight:700">${esc(f.nombre || 'Sin nombre')}</span>
  <span class="insignias">${(f.procesos || []).map((k) => `<span class="insignia pilar-${PILAR[k]}">${esc(proceso(k)?.nombre || k)}</span>`).join('')}${f.ejemplo ? '<span class="insignia aviso">Ejemplo</span>' : ''}</span></a>`;

export function vHexaflex() {
  // Hexágono: momento presente arriba y el resto en el sentido de las agujas del reloj
  const orden = ['presente', 'valores', 'accion', 'yo', 'defusion', 'aceptacion'];
  const pos = orden.map((k, i) => { const ang = (-90 + i * 60) * Math.PI / 180; return { k, x: 50 + 37 * Math.cos(ang), y: 50 + 37 * Math.sin(ang) }; });
  const lineas = pos.flatMap((a, i) => pos.slice(i + 1).map((b) => `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`)).join('') + pos.map((a) => `<line x1="50" y1="50" x2="${a.x}" y2="${a.y}"/>`).join('');
  const total = orden.reduce((s, k) => s + Object.values(nivelesProceso(k)).filter(Boolean).length, 0);
  const b = S.datos().biblio;
  return {
    html: `<div class="pantalla"><div class="item-texto"><h1 class="titulo">Hexaflex</h1><span class="suave pequeno">${esc(MODELO.titulo)}</span></div>
    <div class="hexa" role="navigation" aria-label="Los seis procesos">
      <svg viewBox="0 0 100 100" aria-hidden="true">${lineas}</svg>
      <a href="#/hexaflex/modelo" class="hexa-centro"><span>Flexibilidad psicológica</span></a>
      ${pos.map((p) => `<a href="#/hexaflex/p/${p.k}" class="hexa-nodo pilar-${PILAR[p.k]}" style="left:${p.x}%;top:${p.y}%"><span>${esc(proceso(p.k).nombre)}</span>${puntosNivel(nivelesProceso(p.k), 'en-nodo')}</a>`).join('')}
    </div>
    <div class="tarjeta" style="gap:8px"><div class="fila-entre"><span style="font-weight:700">Tu práctica</span><span class="pequeno suave" style="font-weight:700">${total} de 18 niveles</span></div>
      <div class="barra" aria-hidden="true"><div style="width:${(total / 18) * 100}%"></div></div>
      <span class="mini suave" style="line-height:1.4">Cada proceso tiene tres niveles: <b>escrito</b> (tu versión de una ficha), <b>audio</b> (grabarte recitándola) y <b>role play</b> (practicarla con un compañero).</span></div>
    <div class="seccion">${MODELO.pilares.map((pl) => `<div class="pilar-fila pilar-${pl.k}"><b>${pl.nombre}</b><span class="pequeno suave">${esc(pl.texto)}</span></div>`).join('')}</div>
    <div class="botones"><a href="#/hexaflex/banco" class="btn">${icon('diario', 18)}Banco (${HX().fichas.length})</a><a href="#/biblio" class="btn">${icon('guia', 18)}Bibliografía (${b.filter((x) => x.estado === 'leido').length}/${b.length})</a></div>
    </div>${nav('hexaflex')}`,
  };
}

export function vHxModelo() {
  return {
    html: `<div class="pantalla sin-nav">${volver('#/hexaflex', 'El modelo')}
    <h1 class="titulo">${esc(MODELO.titulo)}</h1>
    <p class="texto-largo" style="color:var(--gris)">${esc(MODELO.intro)}</p>
    ${MODELO.pilares.map((pl) => `<section class="tarjeta pilar-borde pilar-${pl.k}"><b style="font-size:17px">${pl.nombre}</b><p class="pequeno" style="line-height:1.5;color:var(--gris)">${esc(pl.texto)}</p>
      <div class="botones">${pl.procesos.map((k) => `<a href="#/hexaflex/p/${k}" class="btn">${esc(proceso(k).nombre)}</a>`).join('')}</div></section>`).join('')}
    <section class="tarjeta"><label for="n-modelo" class="tipo c-morado" style="font-size:13px">Mis notas de Hayes sobre el modelo</label>
      <textarea id="n-modelo" data-nota="_modelo" rows="6" placeholder="Lo que vas leyendo: definición, inflexibilidad, cómo encaja todo…" style="border:0;padding:0">${esc(HX().notas._modelo)}</textarea>
      <span class="mini suave">Se guarda solo. <span class="guardado c-verde" style="font-weight:700"></span></span></section>
    </div>`,
    mount(r) { autoguardarNotas(r, null, (k, v) => { HX().notas[k] = v; }); },
  };
}

const tabProceso = {};
export function vHxProceso(k) {
  const p = proceso(k); if (!p) return vNoEncontrado();
  const t = TEORIA[k] || {}; const tab = tabProceso[k] || 'teoria';
  const fichas = fichasDe(k); const niv = nivelesProceso(k);
  let cuerpo = '';
  if (tab === 'teoria') {
    cuerpo = `<section class="tarjeta"><span class="tipo c-morado" style="font-size:13px">Qué trabajamos</span>${(t.marco || []).map((x) => `<p class="texto-largo" style="font-size:15px">${esc(x)}</p>`).join('')}</section>
      <h2 class="etiqueta-grupo">Señales que conviene detectar en sesión</h2>
      <div class="seccion">${(t.senales || []).map((s) => `<div class="senal pilar-borde pilar-${PILAR[k]}"><span class="senal-frase">${esc(s.frase)}</span><span class="mini suave">${esc(s.etiqueta)}</span></div>`).join('')}</div>
      ${t.pregunta ? `<div class="aviso-caja">${icon('bocadillo', 18)}<span>${esc(t.pregunta)}</span></div>` : ''}
      <section class="tarjeta"><label for="n-${k}" class="tipo c-morado" style="font-size:13px">Mis notas de Hayes</label>
        <textarea id="n-${k}" data-nota="${k}" rows="6" placeholder="Completa o corrige con tu lectura del libro" style="border:0;padding:0">${esc(HX().notas[k])}</textarea>
        <span class="mini suave">Se guarda solo. <span class="guardado c-verde" style="font-weight:700"></span></span></section>`;
  } else {
    cuerpo = `<div class="fila-entre"><span class="pequeno suave">${fichas.length} ficha${fichas.length === 1 ? '' : 's'}</span><a href="#/hexaflex/editar/nueva?p=${k}" class="btn texto">${icon('mas', 18)} Añadir</a></div>
      <div class="seccion">${fichas.map(tarjetaFicha).join('') || '<p class="vacio">Aún no hay fichas de este proceso.</p>'}</div>`;
  }
  const tb = (v, tx) => `<button class="seg-btn ${tab === v ? 'activo' : ''}" data-act="tab-hx" data-k="${k}" data-v="${v}" role="tab" aria-selected="${tab === v}">${tx}</button>`;
  return {
    html: `<div class="pantalla sin-nav">${volver('#/hexaflex', 'Hexaflex')}
    <div class="item-texto"><span class="tipo pilar-txt-${PILAR[k]}">${esc(t.pilar || '')} · ${esc(p.nombre)}</span><h1 class="titulo">${esc(t.lema || p.nombre)}</h1>
      <p class="texto-largo" style="color:var(--gris);font-size:15px">${esc(t.intro || '')}</p></div>
    <div class="ilus-caja pilar-${PILAR[k]}">${ILUSTRACION[k] || ''}</div>
    <div class="fila-entre tarjeta" style="padding:12px 14px;flex-direction:row"><span class="pequeno" style="font-weight:700">Tu nivel en ${esc(p.nombre.toLowerCase())}</span><span style="display:flex;gap:10px">${NIVELES.map(([nk, nt]) => `<span class="mini ${niv[nk] ? 'c-verde' : 'suave'}" style="font-weight:700">${niv[nk] ? '✓ ' : ''}${nt}</span>`).join('')}</span></div>
    <div class="segmentado" role="tablist">${tb('teoria', 'Teoría')}${tb('fichas', `Fichas (${fichas.length})`)}</div>
    ${cuerpo}</div>`,
    mount(r) { autoguardarNotas(r, null, (kk, v) => { HX().notas[kk] = v; }); },
  };
}

export function vHxBanco() {
  const fichas = [...HX().fichas].filter((f) => !filtroHx || [f.nombre, f.paraQue, f.cuando, f.tipo].join(' ').toLowerCase().includes(filtroHx.toLowerCase())).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es'));
  return {
    html: `<div class="pantalla sin-nav">${volver('#/hexaflex', 'Banco de fichas')}
    <div class="fila-entre"><span class="pequeno suave">${HX().fichas.length} fichas</span><a href="#/hexaflex/editar/nueva" class="btn texto">${icon('mas', 18)} Añadir</a></div>
    <div class="campo"><label for="hx-buscar" class="oculto">Buscar fichas</label><input type="search" id="hx-buscar" placeholder="Buscar: «rumia», «evitación»…" value="${esc(filtroHx)}"></div>
    <div class="seccion">${fichas.map(tarjetaFicha).join('') || '<p class="vacio">No hay fichas que coincidan.</p>'}</div></div>`,
    mount(r) { const b = r.querySelector('#hx-buscar'); b.addEventListener('input', () => { filtroHx = b.value; const pos = b.selectionStart; ctx.render(); const nb = app().querySelector('#hx-buscar'); nb.focus(); nb.setSelectionRange(pos, pos); }); },
  };
}
let filtroHx = '';

// ---------- Ficha: practicar en tres niveles ----------
export function vHxFicha(id) {
  const f = HX().fichas.find((x) => x.id === id); if (!f) return vNoEncontrado();
  const n = nivelesFicha(f); const lib = libro(f.libroId);
  const dato = (t, v) => (v ? `<div class="campo"><span class="etiqueta" style="font-size:13px;color:var(--morado)">${t}</span><p class="texto-largo" style="font-size:15px">${esc(v)}</p></div>` : '');
  const paso = (num, ok, titulo, cont) => `<section class="tarjeta nivel ${ok ? 'hecho' : ''}"><div class="fila-entre"><span style="display:flex;gap:10px;align-items:center"><span class="nivel-num">${ok ? icon('check', 14) : num}</span><b>${titulo}</b></span>${ok ? '<span class="insignia ok">Hecho</span>' : ''}</div>${cont}</section>`;
  return {
    html: `<div class="pantalla sin-nav">${volver(`#/hexaflex/p/${f.principal || f.procesos?.[0] || ''}`, 'Ficha')}
    <div class="item-texto"><span class="tipo c-morado">${esc(f.tipo || '')}</span><h1 class="titulo">${esc(f.nombre)}</h1>
      <span class="insignias">${(f.procesos || []).map((k) => `<span class="insignia pilar-${PILAR[k]}">${esc(proceso(k)?.nombre || k)}</span>`).join('')}</span></div>
    <h2 class="etiqueta-grupo">Practicar en tres niveles</h2>
    ${paso(1, n.escrito, 'Escrito: tu versión', `<label for="mi-version" class="oculto">Tu versión</label><textarea id="mi-version" rows="6" placeholder="Redacta la intervención con tus palabras, como la dirías en sesión">${esc(f.miVersion)}</textarea><span class="mini suave">Se guarda solo. <span class="guardado c-verde" style="font-weight:700"></span></span>`)}
    ${paso(2, n.audio, 'Audio: grábate recitándola', `${(f.audios || []).map((a) => `<div class="medio"><span class="pequeno" style="font-weight:600">${esc(fmtCorta(a.fecha))} · ${esc(a.dur || '')}</span><span id="au-${a.id}" style="flex:1;display:flex;justify-content:flex-end"><button class="btn pequeno" data-act="audio-oir" data-f="${esc(f.id)}" data-a="${esc(a.id)}">▶ Escuchar</button></span><button class="btn texto" data-act="audio-borrar" data-f="${esc(f.id)}" data-a="${esc(a.id)}" aria-label="Borrar audio">${icon('papelera', 16)}</button></div>`).join('')}
      <button class="btn primario" data-act="audio-grabar" data-f="${esc(f.id)}">● Grabar audio</button>`)}
    ${paso(3, n.roleplay, 'Role play con un compañero', `${f.roleplay ? `<p class="pequeno" style="line-height:1.45;color:var(--gris)"><b>Cómo hacerlo:</b> ${esc(f.roleplay)}</p>` : ''}
      ${(f.videos || []).map((v) => `<div class="medio"><span class="pequeno" style="font-weight:600;flex:1">${esc(fmtCorta(v.fecha))} · vídeo</span><a class="btn pequeno" href="${G.enlaceArchivo(v.id)}" target="_blank" rel="noopener">Ver en Drive</a><button class="btn texto" data-act="video-borrar" data-f="${esc(f.id)}" data-v="${esc(v.id)}" aria-label="Borrar vídeo">${icon('papelera', 16)}</button></div>`).join('')}
      <label class="pequeno" style="display:flex;gap:8px;align-items:flex-start;line-height:1.4"><input type="checkbox" id="consent" style="margin-top:3px"> Mi compañero/a sabe que se graba y está de acuerdo en que se guarde. Es un caso inventado, no un paciente real.</label>
      <label class="btn" for="in-video" style="cursor:pointer">${icon('pantalla', 18)}Adjuntar vídeo grabado con la cámara</label><input type="file" id="in-video" accept="video/*" class="oculto">
      <span class="mini suave">Se guarda en tu Drive (Portland Lab › Hexaflex › Role plays).</span>`)}
    <button class="btn" data-act="hx-practica" data-id="${esc(f.id)}">Anotar una práctica (en mí, role play o en terapia)</button>
    ${(f.notasExp || []).map((x) => `<div class="feedback"><span class="tipo c-azul">${esc({ mi: 'En mí', rp: 'Role play', terapia: 'En terapia' }[x.donde] || '')} · ${esc(fmtCorta(x.fecha))}</span>${esc(x.texto)}</div>`).join('')}
    <h2 class="etiqueta-grupo">La ficha</h2>
    <section class="tarjeta">${dato('Objetivo', f.paraQue)}${dato('Cuándo usarlo', f.cuando)}${dato('Precauciones', f.precauciones)}${dato('Guion orientativo', f.guion)}${dato('Errores frecuentes', f.errores)}${dato('Variantes', f.variaciones)}
      ${dato('Fuente', [lib ? `${lib.autor} ${lib.titulo}` : '', f.pagina ? `p. ${f.pagina}` : '', !lib ? f.fuente : ''].filter(Boolean).join(' · '))}
      <a href="#/hexaflex/editar/${encodeURIComponent(f.id)}" class="btn">Editar ficha</a></section>
    </div>`,
    mount(r) {
      const ta = r.querySelector('#mi-version');
      ta.addEventListener('change', () => { S.actualizar(() => { f.miVersion = ta.value.trim(); }); const a = r.querySelector('.guardado'); if (a) { a.textContent = 'Guardado'; setTimeout(() => ctx.render(), 600); } });
      r.querySelector('#in-video').addEventListener('change', async (e) => {
        const file = e.target.files[0]; if (!file) return;
        if (!r.querySelector('#consent').checked) { toast('Marca primero la casilla del consentimiento de tu compañero.', { error: true }); e.target.value = ''; return; }
        await conCarga(r.querySelector('label[for=in-video]'), async () => {
          await ctx.google();
          const dir = await G.carpeta([RAIZ, 'Hexaflex', 'Role plays'], S.datos().ajustes.carpetas);
          const idv = await G.subirGrande(`Role play · ${f.nombre} · ${fmtNum(hoyISO()).replaceAll('/', '-')}${(file.name.match(/\.\w+$/) || [''])[0]}`, file, file.type || 'video/mp4', dir);
          S.actualizar(() => { (f.videos = f.videos || []).push({ id: idv, fecha: hoyISO(), tam: file.size }); });
          toast('Vídeo guardado en tu Drive.', { enlace: G.enlaceArchivo(idv), texto: 'Ver' }); ctx.render();
        });
      });
    },
  };
}

export function vHxEditar(id, params) {
  const nueva = id === 'nueva';
  const f = nueva ? (borradorFicha.f = borradorFicha.f || { id: S.nuevoId(), nombre: '', tipo: 'Metáfora', procesos: params.get('p') ? [params.get('p')] : [], principal: params.get('p') || '', exp: {}, notasExp: [], audios: [], videos: [] }) : HX().fichas.find((x) => x.id === id);
  if (!f) return vNoEncontrado();
  const campo = (n, l, ph, filas = 3) => `<div class="campo"><label for="f-${n}">${l}</label><textarea id="f-${n}" name="${n}" rows="${filas}" placeholder="${esc(ph)}">${esc(f[n])}</textarea></div>`;
  return {
    html: `<div class="pantalla sin-nav">${volver(nueva ? '#/hexaflex/banco' : `#/hexaflex/ficha/${encodeURIComponent(f.id)}`, nueva ? 'Nueva ficha' : 'Editar ficha')}
    <form id="f-hx" class="seccion">
      <div class="campo"><label for="f-nombre">Nombre</label><input type="text" id="f-nombre" name="nombre" required value="${esc(f.nombre)}" placeholder="p. ej. Pasajeros en el autobús"></div>
      <div class="campo"><label for="f-tipo">Tipo</label><select id="f-tipo" name="tipo">${TIPOS_FICHA.map((t) => `<option ${t === f.tipo ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <div class="campo"><span class="etiqueta">Procesos que trabaja</span><div class="chips">${PROCESOS.map((p) => `<input type="checkbox" id="pr-${p.k}" name="procesos" value="${p.k}" ${(f.procesos || []).includes(p.k) ? 'checked' : ''}><label for="pr-${p.k}">${esc(p.nombre)}</label>`).join('')}</div></div>
      <div class="campo"><label for="f-principal">Proceso principal</label><select id="f-principal" name="principal"><option value="">—</option>${PROCESOS.map((p) => `<option value="${p.k}" ${p.k === f.principal ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('')}</select></div>
      ${campo('paraQue', 'Objetivo', 'Qué quieres conseguir con ella')}
      ${campo('cuando', 'Cuándo usarlo', 'El paciente… (sin datos de pacientes reales)')}
      ${campo('precauciones', 'Precauciones', 'Qué cuidar al aplicarla', 2)}
      ${campo('guion', 'Guion orientativo', 'Los pasos principales', 5)}
      ${campo('errores', 'Errores frecuentes', 'Lo que conviene evitar', 2)}
      ${campo('variaciones', 'Variantes', 'Adaptación para infancia, versión con objetos…', 2)}
      ${campo('roleplay', 'Para role play', 'Cómo practicarla con un compañero', 2)}
      <div class="dos-col"><div class="campo"><label for="f-libro">Libro</label><select id="f-libro" name="libroId"><option value="">Otra fuente</option>${S.datos().biblio.map((b) => `<option value="${esc(b.id)}" ${b.id === f.libroId ? 'selected' : ''}>${esc(b.titulo.slice(0, 40))}</option>`).join('')}</select></div>
      <div class="campo"><label for="f-pagina">Página(s)</label><input type="text" id="f-pagina" name="pagina" value="${esc(f.pagina)}" placeholder="p. ej. 145-147"></div></div>
      <div class="campo"><label for="f-fuente">Otra fuente o detalle</label><input type="text" id="f-fuente" name="fuente" value="${esc(f.fuente)}" placeholder="Capítulo, artículo, web…"></div>
      <button class="btn primario grande">Guardar ficha</button>
      ${!nueva ? `<button type="button" class="btn peligro" id="b-borrar-ficha">${icon('papelera', 18)}Eliminar ficha</button>` : ''}
    </form></div>`,
    mount(r) {
      const form = r.querySelector('#f-hx');
      form.addEventListener('submit', (e) => {
        e.preventDefault(); const v = leerForm(form);
        const procesos = [].concat(v.procesos || []);
        Object.assign(f, { nombre: v.nombre.trim(), tipo: v.tipo, procesos, principal: v.principal || procesos[0] || '', paraQue: v.paraQue.trim(), cuando: v.cuando.trim(), precauciones: v.precauciones.trim(), guion: v.guion.trim(), errores: v.errores.trim(), variaciones: v.variaciones.trim(), roleplay: v.roleplay.trim(), libroId: v.libroId, pagina: v.pagina.trim(), fuente: v.fuente.trim(), ejemplo: false });
        S.actualizar((s) => { if (nueva) { s.hexaflex.fichas.push(f); delete borradorFicha.f; } });
        toast('Ficha guardada.'); irA(`#/hexaflex/ficha/${encodeURIComponent(f.id)}`);
      });
      r.querySelector('#b-borrar-ficha')?.addEventListener('click', () => confirmar('¿Eliminar esta ficha?', 'Se borra del banco. Los audios y vídeos que tenga siguen en tu Drive.', 'Eliminar', () => {
        S.actualizar((s) => { s.hexaflex.fichas = s.hexaflex.fichas.filter((x) => x.id !== f.id); s.borrados = [...new Set([...(s.borrados || []), f.id])]; }); irA('#/hexaflex/banco');
      }));
    },
  };
}
const borradorFicha = {};

// ---------- Grabar audio ----------
function modalGrabar(fichaId) {
  const f = HX().fichas.find((x) => x.id === fichaId);
  let rec = null; let stream = null; let partes = []; let inicio = 0; let reloj = null; let blob = null; let mime = '';
  const parar = () => { try { rec?.state === 'recording' && rec.stop(); } catch {} stream?.getTracks().forEach((t) => t.stop()); clearInterval(reloj); };
  const fmt = (ms) => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const d = abrirModal(`<h2>Grabar audio</h2><p class="suave pequeno" style="line-height:1.45">Recita «${esc(f.nombre)}» como si estuvieras en sesión.</p>
    <div style="text-align:center;padding:10px 0"><span id="g-t" class="horas-num" aria-live="polite">0:00</span></div>
    <div id="g-prev"></div>
    <div class="botones"><button type="button" class="btn" id="g-cancelar">Cancelar</button><button type="button" class="btn primario" id="g-btn">● Empezar</button></div>`, (dd) => {
    dd.querySelector('#g-cancelar').addEventListener('click', () => { parar(); cerrarModal(); });
    dd.querySelector('#g-btn').addEventListener('click', async (e) => {
      const b = e.currentTarget;
      if (b.dataset.estado === 'listo') {
        // Guardar
        const id = S.nuevoId(); const dur = fmt(Date.now() - inicio);
        await idbSet(`audio-${id}`, blob);
        S.actualizar(() => { (f.audios = f.audios || []).push({ id, fecha: hoyISO(), dur: dd.querySelector('#g-t').textContent, mime }); });
        cerrarModal(); toast('Audio guardado.'); ctx.render();
        subirAudiosPendientes().catch((er) => console.warn(er));
        return;
      }
      if (rec?.state === 'recording') { rec.stop(); return; }
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
      catch { toast('No se pudo usar el micrófono. Revisa el permiso del navegador.', { error: true }); return; }
      mime = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((m) => window.MediaRecorder?.isTypeSupported?.(m)) || '';
      rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined); partes = [];
      rec.ondataavailable = (ev) => { if (ev.data.size) partes.push(ev.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop()); clearInterval(reloj);
        blob = new Blob(partes, { type: rec.mimeType || mime || 'audio/webm' }); mime = blob.type;
        dd.querySelector('#g-prev').innerHTML = `<audio controls src="${URL.createObjectURL(blob)}" style="width:100%"></audio>`;
        b.textContent = 'Guardar'; b.dataset.estado = 'listo';
        dd.querySelector('#g-cancelar').textContent = 'Descartar';
      };
      rec.start(); inicio = Date.now(); b.textContent = '■ Parar';
      reloj = setInterval(() => { dd.querySelector('#g-t').textContent = fmt(Date.now() - inicio); }, 250);
    });
  });
  d.addEventListener('close', parar, { once: true });
}
// Sube a Drive los audios que aún no están (se guardan antes en el dispositivo)
export async function subirAudiosPendientes() {
  if (!G.conectado()) return;
  for (const f of HX().fichas) for (const a of f.audios || []) {
    if (a.driveId) continue;
    const blob = await idbGet(`audio-${a.id}`).catch(() => null); if (!blob) continue;
    const dir = await G.carpeta([RAIZ, 'Hexaflex', 'Audios'], S.datos().ajustes.carpetas);
    const ext = (a.mime || '').includes('mp4') ? '.m4a' : '.webm';
    a.driveId = await G.subirGrande(`${f.nombre} · ${fmtNum(a.fecha).replaceAll('/', '-')}${ext}`, blob, a.mime || 'audio/webm', dir);
    S.guardar();
  }
}

// ======================= Bibliografía =======================
const ESTADOS_LIB = [['pendiente', 'Pendientes'], ['curso', 'En curso'], ['leido', 'Leídos']];
let tabBiblio = 'curso';
export function vBiblio() {
  const b = S.datos().biblio;
  const lista = b.filter((x) => x.estado === tabBiblio);
  const fichasLib = (id) => HX().fichas.filter((f) => f.libroId === id);
  return {
    html: `<div class="pantalla sin-nav">${volver('#/hexaflex', 'Bibliografía')}
    <div class="segmentado" role="tablist">${ESTADOS_LIB.map(([k, t]) => `<button class="seg-btn ${tabBiblio === k ? 'activo' : ''}" data-act="tab-biblio" data-v="${k}" role="tab" aria-selected="${tabBiblio === k}">${t} (${b.filter((x) => x.estado === k).length})</button>`).join('')}</div>
    <button class="btn linea" data-act="libro-nuevo">${icon('mas', 18)}Añadir libro</button>
    <div class="seccion">${lista.map((l) => `<section class="tarjeta">
      <div class="item-texto"><span style="font-size:16px;font-weight:700;line-height:1.3">${esc(l.titulo)}</span><span class="item-sub">${esc(l.autor)}</span></div>
      ${l.progreso ? `<span class="pequeno"><b>Voy por:</b> ${esc(l.progreso)}</span>` : ''}${l.notas ? `<p class="pequeno suave" style="line-height:1.45">${esc(l.notas)}</p>` : ''}
      ${fichasLib(l.id).length ? `<span class="insignias">${fichasLib(l.id).map((f) => `<a href="#/hexaflex/ficha/${encodeURIComponent(f.id)}" class="insignia">${esc(f.nombre)}</a>`).join('')}</span>` : ''}
      <div class="botones">${l.estado !== 'leido' ? `<button class="btn primario" data-act="libro-estado" data-id="${esc(l.id)}" data-v="${l.estado === 'pendiente' ? 'curso' : 'leido'}">${l.estado === 'pendiente' ? 'Empezar a leer' : '✓ Marcar como leído'}</button>` : `<button class="btn" data-act="libro-estado" data-id="${esc(l.id)}" data-v="curso">Volver a «En curso»</button>`}<button class="btn" data-act="libro-editar" data-id="${esc(l.id)}">Editar</button></div>
    </section>`).join('') || `<p class="vacio">No hay libros ${tabBiblio === 'leido' ? 'leídos' : tabBiblio === 'curso' ? 'en curso' : 'pendientes'}.</p>`}</div></div>`,
  };
}
function modalLibro(id) {
  const l = id ? S.datos().biblio.find((x) => x.id === id) : null;
  abrirModal(`<h2>${l ? 'Editar libro' : 'Añadir libro'}</h2>
  <form id="f-lib" class="seccion">
    <div class="campo"><label for="l-tit">Título</label><input type="text" id="l-tit" name="titulo" required value="${esc(l?.titulo)}"></div>
    <div class="campo"><label for="l-aut">Autor/es</label><input type="text" id="l-aut" name="autor" value="${esc(l?.autor)}"></div>
    <div class="campo"><span class="etiqueta">Estado</span>${seg('estado', ESTADOS_LIB.map(([k, t]) => [k, t.replace('Pendientes', 'Pendiente').replace('Leídos', 'Leído')]), l?.estado || 'pendiente')}</div>
    <div class="campo"><label for="l-prog">Por dónde voy</label><input type="text" id="l-prog" name="progreso" value="${esc(l?.progreso)}" placeholder="p. ej. parte 3, capítulo 8"></div>
    <div class="campo"><label for="l-not">Notas</label><textarea id="l-not" name="notas" rows="3">${esc(l?.notas)}</textarea></div>
    <div class="botones"><button type="button" class="btn" data-cerrar>Cancelar</button><button class="btn primario">Guardar</button></div>
    ${l ? '<button type="button" class="btn texto" id="b-del-lib" style="color:var(--error)">Eliminar libro</button>' : ''}
  </form>`, (d) => {
    d.querySelector('#f-lib').addEventListener('submit', (e) => {
      e.preventDefault(); const v = leerForm(e.target);
      S.actualizar((s) => { const datos = { titulo: v.titulo.trim(), autor: v.autor.trim(), estado: v.estado, progreso: v.progreso.trim(), notas: v.notas.trim() }; if (l) Object.assign(l, datos); else s.biblio.push({ id: S.nuevoId(), ...datos }); });
      tabBiblio = v.estado; cerrarModal(); ctx.render();
    });
    d.querySelector('#b-del-lib')?.addEventListener('click', () => { S.actualizar((s) => { s.biblio = s.biblio.filter((x) => x.id !== l.id); s.borrados = [...new Set([...(s.borrados || []), l.id])]; }); cerrarModal(); ctx.render(); });
  });
}

function modalPracticaFicha(id) {
  const f = HX().fichas.find((x) => x.id === id);
  abrirModal(`<h2>He practicado «${esc(f.nombre)}»</h2>
  <form id="f-pf" class="seccion">
    <div class="campo"><span class="etiqueta">¿Dónde?</span>${seg('donde', [['mi', 'En mí'], ['rp', 'Role play'], ['terapia', 'En terapia']], 'rp')}</div>
    <div class="campo"><label for="pf-fecha">Fecha</label><input type="date" id="pf-fecha" name="fecha" value="${hoyISO()}"></div>
    <div class="campo"><label for="pf-txt">¿Cómo ha ido?</label><textarea id="pf-txt" name="texto" rows="4" placeholder="Qué funcionó, qué cambiarías la próxima vez"></textarea>
      <span class="ayuda">Si fue en terapia, sin datos que identifiquen al paciente.</span></div>
    <div class="botones"><button type="button" class="btn" data-cerrar>Cancelar</button><button class="btn primario">Guardar</button></div>
  </form>`, (d) => {
    d.querySelector('#f-pf').addEventListener('submit', (e) => {
      e.preventDefault(); const v = leerForm(e.target);
      S.actualizar((s) => {
        f.exp = { ...(f.exp || {}), [v.donde]: true };
        (f.notasExp = f.notasExp || []).push({ fecha: v.fecha, donde: v.donde, texto: v.texto.trim() });
      });
      cerrarModal(); toast('Práctica registrada.'); ctx.render();
    });
  });
}


// ---------- Acciones (clics) del Hexaflex ----------
export const accionesHx = {
  'hx-practica': (b) => modalPracticaFicha(b.dataset.id),
  'tab-hx': (b) => { tabProceso[b.dataset.k] = b.dataset.v; ctx.render(); },
  'tab-biblio': (b) => { tabBiblio = b.dataset.v; ctx.render(); },
  'libro-nuevo': () => modalLibro(null),
  'libro-editar': (b) => modalLibro(b.dataset.id),
  'libro-estado': (b) => { S.actualizar((s) => { s.biblio.find((x) => x.id === b.dataset.id).estado = b.dataset.v; }); toast(b.dataset.v === 'leido' ? 'Libro marcado como leído.' : 'Libro en curso.'); tabBiblio = b.dataset.v; ctx.render(); },
  'audio-grabar': (b) => { if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { toast('Este navegador no permite grabar audio.', { error: true }); return; } modalGrabar(b.dataset.f); },
  'audio-oir': async (b) => {
    const f = HX().fichas.find((x) => x.id === b.dataset.f); const a = f.audios.find((x) => x.id === b.dataset.a);
    await conCarga(b, async () => {
      let blob = await idbGet(`audio-${a.id}`).catch(() => null);
      if (!blob && a.driveId) { await ctx.google(); blob = new Blob([await G.descargarArchivo(a.driveId)], { type: a.mime || 'audio/webm' }); await idbSet(`audio-${a.id}`, blob); }
      if (!blob) throw new Error('Este audio no está en este dispositivo ni en tu Drive.');
      const caja = document.getElementById(`au-${a.id}`); if (caja) caja.innerHTML = `<audio controls autoplay src="${URL.createObjectURL(blob)}" style="width:100%;max-width:240px"></audio>`;
    });
  },
  'audio-borrar': (b) => confirmar('¿Borrar este audio?', 'Se borra de la app y de tu Drive.', 'Borrar', async () => {
    const f = HX().fichas.find((x) => x.id === b.dataset.f); const a = f.audios.find((x) => x.id === b.dataset.a);
    try { if (a.driveId && G.conectado()) await G.borrarArchivo(a.driveId); } catch (e) { console.warn(e); }
    await idbSet(`audio-${a.id}`, null).catch(() => {});
    S.actualizar(() => { f.audios = f.audios.filter((x) => x.id !== a.id); }); ctx.render();
  }),
  'video-borrar': (b) => confirmar('¿Borrar este vídeo?', 'Se borra de la app y de tu Drive.', 'Borrar', () => conCarga(null, async () => {
    const f = HX().fichas.find((x) => x.id === b.dataset.f);
    await ctx.google(); await G.borrarArchivo(b.dataset.v);
    S.actualizar(() => { f.videos = f.videos.filter((x) => x.id !== b.dataset.v); }); ctx.render();
  })),
};
