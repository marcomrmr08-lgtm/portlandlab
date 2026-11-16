// Grupo Portland: preparador personal de intervenciones para los role plays.
// Cada estrategia sigue cuatro pasos: diseñar, guion, ensayar (con modo práctica) y revisar.
// Es personal: se guarda con el resto de tus datos (este dispositivo y tu Drive).
import * as S from './store.js';
import { TEORIA } from './hexaflexBase.js';
import { PROCESOS, PILAR, proceso } from './procesos.js';
import { esc, hoyISO, fmtFecha, fmtCorta, toast, abrirModal, cerrarModal, icon } from './ui.js';
import { ctx, app, irA, nav, volver, seg, leerForm, confirmar, vNoEncontrado as noEncontrado } from './comun.js';

const vNoEncontrado = () => noEncontrado('#/portland');
const E = () => S.datos().estrategias;
const est = (id) => E().find((x) => x.id === id);
const fichasHx = () => S.datos().hexaflex.fichas;
const ficha = (id) => fichasHx().find((f) => f.id === id);
const chips = (ks = []) => ks.filter((k) => proceso(k)).map((k) => `<span class="insignia pilar-${PILAR[k]}">${esc(proceso(k).nombre)}</span>`).join('');
const url = (x, resto = '') => `#/portland/e/${encodeURIComponent(x.id)}${resto}`;

// Etapas que se proponen al empezar el guion (se pueden cambiar o quitar)
const ETAPAS = [
  ['Abrir', 'Cómo conectas con el paciente y presentas el foco de la sesión.'],
  ['Explorar', 'Preguntas para ver cómo aparece el proceso (fusión, evitación…).'],
  ['Intervenir', 'La metáfora o el ejercicio, paso a paso.'],
  ['Cerrar', 'Cómo recoges lo vivido y lo conectas con lo que le importa.'],
];
const MODOS = { solo: 'En voz alta, solo', companero: 'Con un compañero', grupo: 'En el Grupo Portland' };

// Estado de cada paso (para la lista y la ficha)
function pasos(x) {
  const r = x.revision || {};
  return {
    diseno: Boolean(x.situacion || x.objetivo),
    guion: x.pasos.some((p) => p.texto),
    ensayos: x.ensayos.length,
    revision: Boolean(r.funciono || r.cambiaria || r.paciente || r.grupo),
  };
}
const siguiente = (x) => { const p = pasos(x); return !p.diseno ? 'diseno' : !p.guion ? 'guion' : !p.ensayos ? 'ensayo' : !p.revision ? 'revision' : null; };

// ======================= Lista =======================
export function vPortland() {
  const lista = [...E()].sort((a, b) => Number(pasos(a).revision) - Number(pasos(b).revision) || (b.fecha || b.creado || '').localeCompare(a.fecha || a.creado || ''));
  const notas = S.datos().portland?.notas || '';
  return {
    html: `<div class="pantalla">
    <div class="item-texto"><h1 class="titulo">Grupo Portland</h1><span class="suave pequeno">Prepara, ensaya y revisa tu intervención para el role play</span></div>
    ${lista.length ? `<div class="seccion">${lista.map(tarjeta).join('')}</div>` : `
    <section class="tarjeta">
      <b style="font-size:17px">Tu primera estrategia</b>
      <p class="pequeno suave" style="line-height:1.5">Cada estrategia es la intervención que vas a poner en marcha en un role play. Se prepara en cuatro pasos:</p>
      <ol class="pasos-est">
        <li><b>Diseñar</b><span>Qué proceso trabajas, la situación del paciente, tu objetivo y las técnicas.</span></li>
        <li><b>Guion</b><span>Los pasos de la intervención, qué haces si se atasca y frases de apoyo.</span></li>
        <li><b>Ensayar</b><span>Modo práctica con tu guion en grande y temporizador.</span></li>
        <li><b>Revisar</b><span>Qué funcionó, qué cambiarías y lo que te dijeron. Pasa al Diario y al Hexaflex.</span></li>
      </ol>
      <button class="btn primario grande" data-act="est-nueva">${icon('mas', 20)}Nueva estrategia</button>
    </section>`}
    <details class="tarjeta sobre-grupo">
      <summary><b>Sobre el grupo</b><span class="mini suave">Intención, estructura y tus notas</span></summary>
      <p class="pequeno" style="line-height:1.5">Un entorno de práctica experiencial sobre los procesos de ACT, dinámico y lúdico: experimentar la flexibilidad en uno mismo, practicar cómo facilitarla en otros y sostenernos como grupo.</p>
      <div class="estructura">
        <div><b class="t">Inicio</b><span>Meditación guiada para poner el tono.</span></div>
        <div><b class="t">30 min</b><span>Práctica en parejas<span class="sub"><span>15 min · Intervención</span><span>5 min · Feedback del paciente</span><span>10 min · Feedback del grupo</span></span></span></div>
        <div><b class="t">Cierre</b><span>Meditación guiada u otras ideas.</span></div>
      </div>
      <label for="pl-notas" class="etiqueta" style="margin-top:6px">Mis notas sobre la dinámica</label>
      <textarea id="pl-notas" rows="4" placeholder="Dudas, ideas, lo que quieres probar…">${esc(notas)}</textarea>
    </details>
    </div>${lista.length ? `<button class="fab" data-act="est-nueva">${icon('mas', 22)}Nueva estrategia</button>` : ''}${nav('portland')}`,
    mount(r) {
      const t = r.querySelector('#pl-notas');
      t?.addEventListener('change', () => { S.actualizar((s) => { s.portland = { ...(s.portland || {}), notas: t.value.trim() }; }); toast('Notas guardadas.', { ms: 1500 }); });
    },
  };
}
function progreso(x) {
  const p = pasos(x);
  const punto = (ok, t) => `<span class="paso-pt ${ok ? 'ok' : ''}">${ok ? icon('check', 12) : ''}${t}</span>`;
  return `<span class="pasos-pts">${punto(p.diseno, 'Diseño')}${punto(p.guion, 'Guion')}${punto(p.ensayos, p.ensayos ? `${p.ensayos} ensayo${p.ensayos === 1 ? '' : 's'}` : 'Ensayo')}${punto(p.revision, 'Revisión')}</span>`;
}
function tarjeta(x) {
  return `<a href="${url(x)}" class="item entrada">
    <span class="fila-entre"><span class="entrada-titulo">${esc(x.titulo)}</span>${x.fecha ? `<span class="mini suave">${esc(fmtCorta(x.fecha))}</span>` : ''}</span>
    ${x.procesos.length ? `<span class="insignias">${chips(x.procesos)}</span>` : ''}
    ${x.objetivo ? `<span class="entrada-extracto">${esc(x.objetivo)}</span>` : ''}
    ${progreso(x)}</a>`;
}

function modalNueva() {
  abrirModal(`<h2>Nueva estrategia</h2>
  <form id="f-nueva" class="seccion">
    <div class="campo"><label for="n-tit">Nombre</label><input type="text" id="n-tit" name="titulo" required maxlength="100" placeholder="p. ej. Defusión con la voz crítica"></div>
    <div class="campo"><label for="n-fecha">Fecha del role play <span class="suave" style="font-weight:400">(opcional)</span></label><input type="date" id="n-fecha" name="fecha"></div>
    <div class="campo"><span class="etiqueta">Proceso que vas a trabajar</span><div class="chips">${PROCESOS.map((p) => `<input type="checkbox" id="np-${p.k}" name="procesos" value="${p.k}"><label for="np-${p.k}">${esc(p.nombre)}</label>`).join('')}</div></div>
    <div class="botones"><button type="button" class="btn" data-cerrar>Cancelar</button><button class="btn primario">Crear</button></div>
  </form>`, (d) => {
    d.querySelector('#f-nueva').addEventListener('submit', (e) => {
      e.preventDefault(); const v = leerForm(e.target);
      const x = { id: S.nuevoId(), titulo: v.titulo.trim(), fecha: v.fecha || '', procesos: [].concat(v.procesos || []), situacion: '', objetivo: '', fichas: [], tecnica: '', pasos: [], bloqueos: [], frases: '', minutos: 15, ensayos: [], revision: {}, creado: new Date().toISOString() };
      S.actualizar((s) => { s.estrategias.push(x); });
      cerrarModal(); irA(url(x, '/editar/diseno'));
    });
  });
}

// ======================= Ficha de la estrategia =======================
export function vEstrategia(id) {
  const x = est(id); if (!x) return vNoEncontrado();
  const p = pasos(x); const sig = siguiente(x); const r = x.revision || {};
  const bloque = (n, clave, titulo, hecho, cuerpo, accion) => `<section class="tarjeta paso-est ${hecho ? 'hecho' : ''} ${sig === clave ? 'actual' : ''}">
    <div class="fila-entre"><span style="display:flex;gap:10px;align-items:center"><span class="nivel-num">${hecho ? icon('check', 14) : n}</span><b style="font-size:17px">${titulo}</b></span>${accion}</div>${cuerpo}</section>`;
  const editar = (sec, t = 'Editar') => `<a href="${url(x, `/editar/${sec}`)}" class="btn texto pequeno">${icon('editar', 16)}${t}</a>`;
  const dato = (t, v) => (v ? `<div class="fb-campo"><span class="mini suave">${t}</span><p>${esc(v)}</p></div>` : '');
  const fs = x.fichas.map(ficha).filter(Boolean);
  const ayuda = x.procesos.filter((k) => TEORIA[k]?.pregunta).map((k) => `<li><b>${esc(proceso(k).nombre)}.</b> ${esc(TEORIA[k].pregunta.replace(/^Pregunta de evaluación útil:\s*/, ''))}</li>`).join('');

  const diseno = p.diseno || fs.length || x.tecnica
    ? `${dato('Situación del paciente', x.situacion)}${dato('Objetivo', x.objetivo)}
       ${fs.length || x.tecnica ? `<div class="fb-campo"><span class="mini suave">Técnicas</span><span class="insignias">${fs.map((f) => `<a href="#/hexaflex/ficha/${encodeURIComponent(f.id)}" class="insignia">${esc(f.nombre)}</a>`).join('')}</span>${x.tecnica ? `<p>${esc(x.tecnica)}</p>` : ''}</div>` : ''}
       ${ayuda ? `<details class="ayuda-proc"><summary class="pequeno">Preguntas útiles para evaluar el proceso</summary><ul>${ayuda}</ul></details>` : ''}`
    : '<p class="pequeno suave">Define la situación del paciente, tu objetivo y las técnicas que vas a usar.</p>';
  const guion = p.guion || x.bloqueos.length || x.frases
    ? `<ol class="guion-lista">${x.pasos.filter((s) => s.texto || s.etapa).map((s) => `<li><b>${esc(s.etapa || 'Paso')}</b><span>${esc(s.texto)}</span></li>`).join('')}</ol>
       ${x.bloqueos.length ? `<div class="fb-campo"><span class="mini suave">Si se atasca…</span>${x.bloqueos.map((b) => `<p class="si-ent"><b>Si</b> ${esc(b.si)} <b>→</b> ${esc(b.entonces)}</p>`).join('')}</div>` : ''}
       ${x.frases ? `<div class="fb-campo"><span class="mini suave">Frases de apoyo</span><ul class="frases">${x.frases.split('\n').filter((l) => l.trim()).map((l) => `<li>${esc(l.trim())}</li>`).join('')}</ul></div>` : ''}`
    : '<p class="pequeno suave">Escribe los pasos de tu intervención, qué harás si el paciente se atasca y frases que quieras tener a mano.</p>';
  const ensayo = `${x.ensayos.length ? `<ul class="ensayos">${[...x.ensayos].reverse().map((e) => `<li><span class="mini suave">${esc(fmtCorta(e.fecha))} · ${esc(MODOS[e.modo] || '')}</span>${e.nota ? `<span>${esc(e.nota)}</span>` : ''}</li>`).join('')}</ul>` : '<p class="pequeno suave">Practica en voz alta con el modo práctica: tu guion en grande y un temporizador de ' + x.minutos + ' minutos.</p>'}
    <div class="botones"><a href="${url(x, '/practicar')}" class="btn ${p.guion ? 'primario' : ''}">${icon('play', 18)}Practicar</a><button class="btn" data-act="est-ensayo" data-id="${esc(x.id)}">Anotar ensayo</button></div>`;
  const revision = p.revision
    ? `${dato('Lo que dijo el paciente', r.paciente)}${dato('Feedback del grupo', r.grupo)}${dato('Qué funcionó', r.funciono)}${dato('Qué cambiaría', r.cambiaria)}
       ${(r.procesosVistos || []).length ? `<div class="fb-campo"><span class="mini suave">Procesos que aparecieron</span><span class="insignias">${chips(r.procesosVistos)}</span></div>` : ''}
       <div class="botones"><button class="btn" data-act="est-a-diario" data-id="${esc(x.id)}">${icon('diario', 18)}${x.diarioId ? 'Ver en el Diario' : 'Llevar al Diario'}</button>${fs.length ? `<button class="btn" data-act="est-a-fichas" data-id="${esc(x.id)}">${icon('hexa', 18)}Anotar en mis fichas</button>` : ''}</div>`
    : '<p class="pequeno suave">Después del role play: lo que te dijeron, qué funcionó y qué cambiarías.</p>';

  return {
    html: `<div class="pantalla sin-nav">${volver('#/portland', 'Estrategia')}
    <div class="item-texto">${x.fecha ? `<span class="tipo" style="color:var(--verde)">${esc(fmtFecha(x.fecha))}</span>` : ''}<h1 class="titulo" style="font-size:26px">${esc(x.titulo)}</h1></div>
    ${x.procesos.length ? `<span class="insignias">${chips(x.procesos)}</span>` : ''}
    ${bloque(1, 'diseno', 'Diseñar', p.diseno, diseno, editar('diseno', p.diseno ? 'Editar' : 'Empezar'))}
    ${bloque(2, 'guion', 'Guion', p.guion, guion, editar('guion', p.guion ? 'Editar' : 'Escribir'))}
    ${bloque(3, 'ensayo', 'Ensayar', p.ensayos > 0, ensayo, '')}
    ${bloque(4, 'revision', 'Revisar', p.revision, revision, editar('revision', p.revision ? 'Editar' : 'Escribir'))}
    <div class="botones"><button class="btn" data-act="est-duplicar" data-id="${esc(x.id)}">${icon('copiar', 18)}Duplicar</button><button class="btn peligro" data-act="est-borrar" data-id="${esc(x.id)}">${icon('papelera', 18)}Eliminar</button></div>
    <p class="mini suave" style="text-align:center;line-height:1.5">Duplicar sirve para reutilizar el guion en otro role play.</p>
    </div>`,
  };
}

// ======================= Editar por secciones =======================
const borrador = {}; // listas del guion mientras se editan
export function vEditar(id, sec) {
  const x = est(id); if (!x) return vNoEncontrado();
  const titulos = { diseno: 'Diseñar', guion: 'Guion', revision: 'Revisar' };
  if (!titulos[sec]) return vNoEncontrado();
  let cuerpo = '';
  if (sec === 'diseno') {
    const orden = [...fichasHx()].sort((a, b) => Number(b.procesos.some((k) => x.procesos.includes(k))) - Number(a.procesos.some((k) => x.procesos.includes(k))) || a.nombre.localeCompare(b.nombre, 'es'));
    cuerpo = `
      <div class="campo"><label for="e-tit">Nombre</label><input type="text" id="e-tit" name="titulo" required maxlength="100" value="${esc(x.titulo)}"></div>
      <div class="campo"><label for="e-fecha">Fecha del role play</label><input type="date" id="e-fecha" name="fecha" value="${esc(x.fecha)}"></div>
      <div class="campo"><span class="etiqueta">Procesos</span><div class="chips">${PROCESOS.map((p) => `<input type="checkbox" id="ep-${p.k}" name="procesos" value="${p.k}" ${x.procesos.includes(p.k) ? 'checked' : ''}><label for="ep-${p.k}">${esc(p.nombre)}</label>`).join('')}</div></div>
      <div class="campo"><label for="e-sit">Situación del paciente</label><textarea id="e-sit" name="situacion" rows="4" placeholder="Quién es, qué le pasa y cómo aparece el proceso. Inventado o un «real play» ligero.">${esc(x.situacion)}</textarea></div>
      <div class="campo"><label for="e-obj">Objetivo de la intervención</label><textarea id="e-obj" name="objetivo" rows="3" placeholder="Qué quieres que el paciente note o experimente al terminar.">${esc(x.objetivo)}</textarea></div>
      <div class="campo"><span class="etiqueta">Técnicas de tu Hexaflex</span>${orden.length ? `<div class="chips">${orden.map((f) => `<input type="checkbox" id="ef-${esc(f.id)}" name="fichas" value="${esc(f.id)}" ${x.fichas.includes(f.id) ? 'checked' : ''}><label for="ef-${esc(f.id)}">${esc(f.nombre)}</label>`).join('')}</div>` : '<span class="ayuda">Aún no tienes fichas en el Hexaflex.</span>'}</div>
      <div class="campo"><label for="e-tec">Otra técnica o variación</label><input type="text" id="e-tec" name="tecnica" maxlength="200" value="${esc(x.tecnica)}"></div>`;
  } else if (sec === 'guion') {
    const b = borrador[x.id] = borrador[x.id] || {
      pasos: x.pasos.length ? x.pasos.map((p) => ({ ...p })) : ETAPAS.map(([etapa]) => ({ id: S.nuevoId(), etapa, texto: '' })),
      bloqueos: x.bloqueos.length ? x.bloqueos.map((p) => ({ ...p })) : [{ id: S.nuevoId(), si: '', entonces: '' }],
      frases: x.frases, minutos: x.minutos,
    };
    const pista = (etapa) => ETAPAS.find(([e]) => e === etapa)?.[1] || '';
    cuerpo = `
      <h2 class="etiqueta-grupo">Pasos de la intervención</h2>
      ${b.pasos.map((p, i) => `<section class="tarjeta paso-edit" data-lista="pasos" data-i="${i}">
        <div class="fila-entre"><label for="pe-${i}" class="oculto">Nombre del paso ${i + 1}</label><input type="text" id="pe-${i}" data-campo="etapa" class="etapa-input" value="${esc(p.etapa)}" placeholder="Paso ${i + 1}" maxlength="40">
          <span style="display:flex;gap:4px"><button type="button" class="icono-btn peq sube" data-act="est-mover" data-l="pasos" data-i="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Subir paso ${i + 1}">${icon('atras', 16)}</button><button type="button" class="icono-btn peq" data-act="est-quitar" data-l="pasos" data-i="${i}" aria-label="Quitar paso ${i + 1}">${icon('papelera', 16)}</button></span></div>
        <label for="pt-${i}" class="oculto">Qué haces en este paso</label><textarea id="pt-${i}" data-campo="texto" rows="3" placeholder="${esc(pista(p.etapa) || 'Qué haces o dices en este paso.')}">${esc(p.texto)}</textarea></section>`).join('')}
      <button type="button" class="btn linea" data-act="est-anadir" data-l="pasos">${icon('mas', 18)}Añadir paso</button>
      <h2 class="etiqueta-grupo">Si el paciente se atasca…</h2>
      ${b.bloqueos.map((p, i) => `<section class="tarjeta paso-edit" data-lista="bloqueos" data-i="${i}">
        <div class="fila-entre"><span class="pequeno" style="font-weight:700">Bloqueo ${i + 1}</span><button type="button" class="icono-btn peq" data-act="est-quitar" data-l="bloqueos" data-i="${i}" aria-label="Quitar bloqueo ${i + 1}">${icon('papelera', 16)}</button></div>
        <div class="campo"><label for="bs-${i}">Si…</label><input type="text" id="bs-${i}" data-campo="si" value="${esc(p.si)}" placeholder="discute la metáfora o dice «ya, pero…»"></div>
        <div class="campo"><label for="be-${i}">Entonces…</label><input type="text" id="be-${i}" data-campo="entonces" value="${esc(p.entonces)}" placeholder="valido y le pregunto qué nota ahora"></div></section>`).join('')}
      <button type="button" class="btn linea" data-act="est-anadir" data-l="bloqueos">${icon('mas', 18)}Añadir bloqueo</button>
      <div class="campo"><label for="e-frases">Frases de apoyo (una por línea)</label><textarea id="e-frases" name="frases" rows="4" placeholder="«¿Y qué te dice tu mente ahora?»&#10;«Fíjate en eso con curiosidad»">${esc(b.frases)}</textarea></div>
      <div class="campo"><label for="e-min">Minutos de la intervención</label><input type="number" id="e-min" name="minutos" min="1" max="60" value="${esc(b.minutos)}" inputmode="numeric"></div>`;
  } else {
    const r = x.revision || {};
    cuerpo = `
      <div class="campo"><label for="r-fecha">Fecha</label><input type="date" id="r-fecha" name="fecha" value="${esc(r.fecha || x.fecha || hoyISO())}"></div>
      <div class="campo"><label for="r-pac">Lo que dijo el paciente</label><textarea id="r-pac" name="paciente" rows="3" placeholder="Cómo se sintió y qué le conectó con la experiencia.">${esc(r.paciente)}</textarea></div>
      <div class="campo"><label for="r-gru">Feedback del grupo</label><textarea id="r-gru" name="grupo" rows="3" placeholder="Qué procesos vieron y qué harían diferente.">${esc(r.grupo)}</textarea></div>
      <div class="campo"><label for="r-fun">Qué funcionó</label><textarea id="r-fun" name="funciono" rows="3">${esc(r.funciono)}</textarea></div>
      <div class="campo"><label for="r-cam">Qué cambiaría la próxima vez</label><textarea id="r-cam" name="cambiaria" rows="3">${esc(r.cambiaria)}</textarea></div>
      <div class="campo"><span class="etiqueta">Procesos que aparecieron</span><div class="chips">${PROCESOS.map((p) => `<input type="checkbox" id="rv-${p.k}" name="procesosVistos" value="${p.k}" ${(r.procesosVistos || []).includes(p.k) ? 'checked' : ''}><label for="rv-${p.k}">${esc(p.nombre)}</label>`).join('')}</div></div>`;
  }
  return {
    html: `<div class="pantalla sin-nav">${volver(url(x), titulos[sec])}
    <form id="f-est" class="seccion">${cuerpo}<button class="btn primario grande">Guardar</button></form></div>`,
    mount(r) {
      const form = r.querySelector('#f-est');
      // Las listas del guion se van guardando en el borrador según se escribe
      form.addEventListener('input', (e) => {
        if (sec === 'guion' && (e.target.name === 'frases' || e.target.name === 'minutos')) { borrador[x.id][e.target.name] = e.target.value; return; }
        const caja = e.target.closest('[data-lista]'); if (!caja || !e.target.dataset.campo) return;
        borrador[x.id][caja.dataset.lista][Number(caja.dataset.i)][e.target.dataset.campo] = e.target.value;
      });
      form.addEventListener('submit', (e) => {
        e.preventDefault(); const v = leerForm(form);
        S.actualizar(() => {
          if (sec === 'diseno') Object.assign(x, { titulo: v.titulo.trim(), fecha: v.fecha || '', procesos: [].concat(v.procesos || []), situacion: v.situacion.trim(), objetivo: v.objetivo.trim(), fichas: [].concat(v.fichas || []), tecnica: v.tecnica.trim() });
          if (sec === 'guion') {
            const b = borrador[x.id];
            x.pasos = b.pasos.map((p) => ({ id: p.id, etapa: p.etapa.trim(), texto: p.texto.trim() })).filter((p) => p.etapa || p.texto);
            x.bloqueos = b.bloqueos.map((p) => ({ id: p.id, si: p.si.trim(), entonces: p.entonces.trim() })).filter((p) => p.si || p.entonces);
            x.frases = v.frases.trim(); x.minutos = Math.min(60, Math.max(1, Number(v.minutos) || 15));
            delete borrador[x.id];
          }
          if (sec === 'revision') x.revision = { fecha: v.fecha, paciente: v.paciente.trim(), grupo: v.grupo.trim(), funciono: v.funciono.trim(), cambiaria: v.cambiaria.trim(), procesosVistos: [].concat(v.procesosVistos || []) };
          x.editado = new Date().toISOString();
        });
        toast('Guardado.'); irA(url(x));
      });
    },
  };
}

// ======================= Modo práctica =======================
let crono = { id: null, corriendo: false, fin: 0, resto: 0, avisado: false };
let tic = null; let audio = null; let bloqueo = null; let pasoActual = 0; let panel = '';
const fmtT = (ms) => { const neg = ms < 0; const s = Math.ceil(Math.abs(ms) / 1000); return `${neg ? '+' : ''}${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const restante = () => (crono.corriendo ? crono.fin - Date.now() : crono.resto);
function pitar() {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.28, 0.56].forEach((t) => {
      const o = audio.createOscillator(); const g = audio.createGain(); o.frequency.value = 660; o.connect(g); g.connect(audio.destination);
      g.gain.setValueAtTime(0.0001, audio.currentTime + t); g.gain.exponentialRampToValueAtTime(0.3, audio.currentTime + t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + t + 0.22);
      o.start(audio.currentTime + t); o.stop(audio.currentTime + t + 0.25);
    });
  } catch {}
  try { navigator.vibrate?.([200, 100, 200]); } catch {}
}
async function pantallaEncendida(on) {
  try { if (on && !bloqueo && navigator.wakeLock) bloqueo = await navigator.wakeLock.request('screen'); if (!on && bloqueo) { await bloqueo.release(); bloqueo = null; } } catch { bloqueo = null; }
}

export function vPracticar(id) {
  const x = est(id); if (!x) return vNoEncontrado();
  if (crono.id !== x.id) { crono = { id: x.id, corriendo: false, fin: 0, resto: x.minutos * 60000, avisado: false }; pasoActual = 0; panel = ''; }
  const lista = x.pasos.filter((p) => p.texto || p.etapa);
  const n = lista.length; if (pasoActual >= n) pasoActual = Math.max(0, n - 1);
  const p = lista[pasoActual];
  const frases = x.frases.split('\n').map((l) => l.trim()).filter(Boolean);
  return {
    html: `<div class="practica">
    <header class="practica-cab"><a href="${url(x)}" class="volver" aria-label="Salir del modo práctica">${icon('atras', 24)}</a>
      <span class="practica-tit">${esc(x.titulo)}</span>
      <span class="practica-crono"><span id="pr-t" role="timer">${fmtT(restante())}</span><button class="ctrl peq" data-act="pr-play" aria-label="${crono.corriendo ? 'Pausar' : 'Empezar'} el temporizador">${icon(crono.corriendo ? 'pausa' : 'play', 18)}</button><button class="ctrl peq" data-act="pr-reset" aria-label="Reiniciar el temporizador">${icon('refrescar', 18)}</button></span></header>
    <div class="practica-cuerpo">
      ${n ? `<span class="practica-etq">Paso ${pasoActual + 1} de ${n}${p.etapa ? ` · ${esc(p.etapa)}` : ''}</span>
      <p class="practica-texto">${esc(p.texto) || '<span style="opacity:.6">Sin texto en este paso.</span>'}</p>
      <div class="practica-puntos" aria-hidden="true">${lista.map((_, i) => `<i class="${i === pasoActual ? 'on' : ''}"></i>`).join('')}</div>`
      : `<p class="practica-texto">Aún no tienes guion. Escribe los pasos para practicarlos aquí.</p><a href="${url(x, '/editar/guion')}" class="btn">Escribir el guion</a>`}
      ${x.objetivo ? `<p class="practica-obj"><b>Objetivo:</b> ${esc(x.objetivo)}</p>` : ''}
    </div>
    ${panel === 'bloqueos' && x.bloqueos.length ? `<div class="practica-panel">${x.bloqueos.map((b) => `<p><b>Si</b> ${esc(b.si)} <b>→</b> ${esc(b.entonces)}</p>`).join('')}</div>` : ''}
    ${panel === 'frases' && frases.length ? `<div class="practica-panel">${frases.map((f) => `<p>${esc(f)}</p>`).join('')}</div>` : ''}
    <footer class="practica-pie">
      <div class="practica-tabs">${x.bloqueos.length ? `<button class="chip-osc ${panel === 'bloqueos' ? 'on' : ''}" data-act="pr-panel" data-v="bloqueos" aria-pressed="${panel === 'bloqueos'}">Si se atasca</button>` : ''}${frases.length ? `<button class="chip-osc ${panel === 'frases' ? 'on' : ''}" data-act="pr-panel" data-v="frases" aria-pressed="${panel === 'frases'}">Frases</button>` : ''}</div>
      <div class="practica-nav">
        <button class="ctrl" data-act="pr-paso" data-v="-1" ${pasoActual === 0 ? 'disabled' : ''} aria-label="Paso anterior">${icon('previo', 22)}</button>
        ${pasoActual < n - 1 ? `<button class="ctrl ancho" data-act="pr-paso" data-v="1">Siguiente paso ${icon('sig', 20)}</button>` : `<button class="ctrl ancho" data-act="pr-terminar" data-id="${esc(x.id)}">${icon('check', 20)}Terminar y anotar</button>`}
      </div>
    </footer></div>`,
    mount(raiz) {
      clearInterval(tic);
      const pintar = () => {
        const t = raiz.querySelector('#pr-t'); if (!t || !t.isConnected) { clearInterval(tic); pantallaEncendida(false); return; }
        const ms = restante(); t.textContent = fmtT(ms);
        raiz.querySelector('.practica')?.classList.toggle('tiempo', ms <= 0);
        if (ms <= 0 && crono.corriendo && !crono.avisado) { crono.avisado = true; pitar(); }
      };
      pintar(); tic = setInterval(pintar, 250);
    },
  };
}

function modalEnsayo(id, alTerminar) {
  const x = est(id);
  abrirModal(`<h2>Anotar ensayo</h2>
  <form id="f-ens" class="seccion">
    <div class="campo"><span class="etiqueta">Cómo has practicado</span>${seg('modo', Object.entries(MODOS).map(([k, t]) => [k, t.replace('En voz alta, solo', 'Solo').replace('Con un compañero', 'Compañero').replace('En el Grupo Portland', 'Grupo')]), 'solo')}</div>
    <div class="campo"><label for="en-nota">Qué notaste <span class="suave" style="font-weight:400">(opcional)</span></label><textarea id="en-nota" name="nota" rows="3" placeholder="Dónde te trabaste, qué paso fluyó…"></textarea></div>
    <div class="botones"><button type="button" class="btn" data-cerrar>Cancelar</button><button class="btn primario">Guardar</button></div>
  </form>`, (d) => {
    d.querySelector('#f-ens').addEventListener('submit', (e) => {
      e.preventDefault(); const v = leerForm(e.target);
      S.actualizar(() => { x.ensayos.push({ id: S.nuevoId(), fecha: hoyISO(), modo: v.modo, nota: v.nota.trim() }); });
      cerrarModal(); toast('Ensayo anotado.'); alTerminar ? alTerminar() : ctx.render();
    });
  });
}

// Revisión → Diario (una reflexión enlazada a la estrategia)
function aDiario(x) {
  const ya = S.datos().diario.find((e) => e.id === x.diarioId);
  if (ya) { irA(`#/diario/e/${encodeURIComponent(ya.id)}`); return; }
  const r = x.revision || {};
  const texto = [
    x.objetivo && `Objetivo: ${x.objetivo}`,
    r.paciente && `Lo que dijo el paciente: ${r.paciente}`,
    r.grupo && `Feedback del grupo: ${r.grupo}`,
    r.funciono && `Qué funcionó: ${r.funciono}`,
    r.cambiaria && `Qué cambiaría: ${r.cambiaria}`,
  ].filter(Boolean).join('\n\n');
  const entrada = { id: S.nuevoId(), tipo: 'reflexion', fecha: r.fecha || hoyISO(), titulo: `Portland · ${x.titulo}`, texto, procesos: [...new Set([...x.procesos, ...(r.procesosVistos || [])])], libroId: '', estrategiaId: x.id, creado: new Date().toISOString() };
  S.actualizar((s) => { s.diario.push(entrada); x.diarioId = entrada.id; });
  toast('Reflexión creada en tu Diario.'); irA(`#/diario/e/${encodeURIComponent(entrada.id)}`);
}
// Revisión → fichas del Hexaflex (cuenta como práctica en role play)
function aFichas(x) {
  const r = x.revision || {};
  const texto = [`Grupo Portland · ${x.titulo}`, r.funciono && `Funcionó: ${r.funciono}`, r.cambiaria && `Cambiaría: ${r.cambiaria}`].filter(Boolean).join('\n');
  let n = 0;
  S.actualizar(() => {
    for (const f of x.fichas.map(ficha).filter(Boolean)) {
      f.exp = { ...(f.exp || {}), rp: true };
      f.notasExp = f.notasExp || [];
      if (!f.notasExp.some((e) => e.estrategiaId === x.id)) { f.notasExp.push({ fecha: r.fecha || hoyISO(), donde: 'rp', texto, estrategiaId: x.id }); n++; }
    }
  });
  toast(n ? `Práctica anotada en ${n} ficha${n === 1 ? '' : 's'} (nivel role play).` : 'Ya estaba anotada en tus fichas.');
}

export const accionesPortland = {
  'est-nueva': () => modalNueva(),
  'est-ensayo': (b) => modalEnsayo(b.dataset.id),
  'est-a-diario': (b) => aDiario(est(b.dataset.id)),
  'est-a-fichas': (b) => aFichas(est(b.dataset.id)),
  'est-duplicar': (b) => {
    const x = est(b.dataset.id); const id = S.nuevoId();
    const copia = { ...JSON.parse(JSON.stringify(x)), id, titulo: `${x.titulo} (copia)`, fecha: '', ensayos: [], revision: {}, diarioId: '', creado: new Date().toISOString() };
    S.actualizar((s) => { s.estrategias.push(copia); }); toast('Estrategia duplicada.'); irA(url(copia));
  },
  'est-borrar': (b) => confirmar('¿Eliminar esta estrategia?', 'Se borran su guion, ensayos y revisión. Lo que llevaste al Diario se conserva.', 'Eliminar', () => {
    S.actualizar((s) => { s.estrategias = s.estrategias.filter((x) => x.id !== b.dataset.id); s.borrados = [...new Set([...(s.borrados || []), b.dataset.id])]; });
    irA('#/portland');
  }),
  // Listas del guion
  'est-anadir': (b) => { const id = location.hash.split('/')[3]; const l = borrador[decodeURIComponent(id)]?.[b.dataset.l]; if (!l) return; l.push(b.dataset.l === 'pasos' ? { id: S.nuevoId(), etapa: '', texto: '' } : { id: S.nuevoId(), si: '', entonces: '' }); ctx.render(); app().querySelector(`[data-lista="${b.dataset.l}"][data-i="${l.length - 1}"] input`)?.focus(); },
  'est-quitar': (b) => { const id = decodeURIComponent(location.hash.split('/')[3]); borrador[id]?.[b.dataset.l].splice(Number(b.dataset.i), 1); ctx.render(); },
  'est-mover': (b) => { const id = decodeURIComponent(location.hash.split('/')[3]); const l = borrador[id]?.[b.dataset.l]; const i = Number(b.dataset.i); if (l && i > 0) { [l[i - 1], l[i]] = [l[i], l[i - 1]]; ctx.render(); } },
  // Modo práctica
  'pr-play': () => {
    if (crono.corriendo) { crono.resto = crono.fin - Date.now(); crono.corriendo = false; pantallaEncendida(false); }
    else { crono.fin = Date.now() + crono.resto; crono.corriendo = true; pantallaEncendida(true); try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); audio.resume?.(); } catch {} }
    ctx.render();
  },
  'pr-reset': () => { const x = est(crono.id); crono = { id: crono.id, corriendo: false, fin: 0, resto: (x?.minutos || 15) * 60000, avisado: false }; pantallaEncendida(false); ctx.render(); },
  'pr-paso': (b) => { pasoActual = Math.max(0, pasoActual + Number(b.dataset.v)); panel = ''; ctx.render(); },
  'pr-panel': (b) => { panel = panel === b.dataset.v ? '' : b.dataset.v; ctx.render(); },
  'pr-terminar': (b) => {
    const x = est(b.dataset.id);
    if (crono.corriendo) { crono.resto = crono.fin - Date.now(); crono.corriendo = false; pantallaEncendida(false); }
    modalEnsayo(x.id, () => { crono.id = null; irA(url(x)); });
  },
};
