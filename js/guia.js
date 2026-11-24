// © 2026 Marco Martínez. Todos los derechos reservados. Ver LICENSE.
// Guía de bienvenida: un recorrido corto por las secciones, señalando cada una sobre la propia app.
import { icon, esc } from './ui.js';

const tab = (r) => `.nav a[href="#/${r}"], .lat-enlace[href="#/${r}"]`;
const PASOS = [
  { ruta: '#/hexaflex', donde: '.hexa', ico: 'hexa', titulo: 'Hexaflex',
    texto: 'El corazón de Flexeo. Toca cualquier proceso para ver su definición, preguntas clave y ejercicios. Es lo primero que verás al abrir la app.' },
  { ruta: '#/biblioteca', donde: '.segmentado', ico: 'guia', titulo: 'Biblioteca',
    texto: 'Dos estanterías: <b>Apuntes</b>, para subir tus PDF y ordenarlos por temas, y <b>Lecturas</b>, para seguir tus libros y guardar citas.' },
  { ruta: '#/diario', donde: '#f-rapido', ico: 'diario', titulo: 'Diario',
    texto: 'Escribe aquí una nota, idea o reflexión y pulsa Guardar. Diez segundos y queda apuntada.' },
  { ruta: '#/roleplay', donde: '[data-act="est-nueva"]', ico: 'pareja', titulo: 'Role play',
    texto: 'Prepara una intervención en cuatro pasos: <b>diseño, guion, ensayo y revisión</b>. Incluye un modo práctica con cronómetro.' },
  { ruta: '#/ajustes', donde: '.principal [data-act="conectar"], .pantalla [data-act="conectar"]', ico: 'ajustes', titulo: 'Tus datos, a salvo', corto: 'Ajustes',
    texto: 'Conecta tu Google para guardar todo en tu Drive y tenerlo en todos tus dispositivos. Aquí también puedes descargar copias.' },
];
const tabDe = (ruta) => tab(ruta.slice(2));

let raiz = null; let paso = -1; let alTerminar = null;

function visible(sel) {
  for (const el of document.querySelectorAll(sel)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

function colocar() {
  if (!raiz) return;
  const p = PASOS[paso];
  const el = p && (visible(p.donde) || visible(tabDe(p.ruta)));
  const foco = raiz.querySelector('.guia-foco'); const tarjeta = raiz.querySelector('.guia-tarjeta');
  const vw = window.innerWidth; const vh = window.innerHeight;
  raiz.classList.toggle('sin-foco', !el);
  if (!el) { foco.style.opacity = '0'; tarjeta.style.left = `${(vw - tarjeta.offsetWidth) / 2}px`; tarjeta.style.top = `${(vh - tarjeta.offsetHeight) / 2}px`; return; }
  const r = el.getBoundingClientRect(); const m = 8;
  Object.assign(foco.style, { opacity: '1', left: `${r.left - m}px`, top: `${r.top - m}px`, width: `${r.width + m * 2}px`, height: `${r.height + m * 2}px` });
  const tw = tarjeta.offsetWidth; const th = tarjeta.offsetHeight;
  const arriba = r.top + r.height / 2 > vh / 2;
  let top = arriba ? r.top - m - th - 16 : r.bottom + m + 16;
  top = Math.max(12, Math.min(top, vh - th - 12));
  let left = r.left + r.width / 2 - tw / 2;
  left = Math.max(12, Math.min(left, vw - tw - 12));
  tarjeta.style.left = `${left}px`; tarjeta.style.top = `${top}px`;
  tarjeta.dataset.lado = arriba ? 'arriba' : 'abajo';
}

function pintar() {
  const p = PASOS[paso];
  const t = raiz.querySelector('.guia-tarjeta');
  t.classList.remove('entra'); void t.offsetWidth; t.classList.add('entra');
  t.innerHTML = `<div class="guia-cab"><span class="guia-ico">${icon(p.ico, 22)}</span><div><span class="guia-num">${paso + 1} de ${PASOS.length}</span><h2 id="guia-titulo">${esc(p.titulo)}</h2></div></div>
    <p>${p.texto}</p>
    <div class="guia-pie"><div class="guia-puntos" aria-hidden="true">${PASOS.map((_, i) => `<i class="${i === paso ? 'on' : i < paso ? 'hecho' : ''}"></i>`).join('')}</div>
      <span class="guia-botones">${paso > 0 ? '<button type="button" class="btn texto pequeno" data-guia="atras">Atrás</button>' : '<button type="button" class="btn texto pequeno" data-guia="fin">Saltar</button>'}
      <button type="button" class="btn primario pequeno" data-guia="sig">${paso === PASOS.length - 1 ? '¡Listo!' : 'Siguiente'}</button></span></div>`;
  t.querySelector('[data-guia="sig"]').focus({ preventScroll: true });
}

function ir(n) {
  if (n >= PASOS.length) { terminar(); return; }
  paso = Math.max(0, n);
  const p = PASOS[paso];
  pintar();
  if (location.hash.split('?')[0] !== p.ruta) location.hash = p.ruta;
  // Espera a que la sección se dibuje y señala el elemento
  setTimeout(() => {
    const el = visible(p.donde);
    if (el && el.getBoundingClientRect().bottom > window.innerHeight - 90) el.scrollIntoView({ block: 'center' });
    requestAnimationFrame(colocar);
  }, 140);
}

function terminar() {
  window.removeEventListener('resize', colocar); window.removeEventListener('scroll', colocar, true);
  document.removeEventListener('keydown', teclas);
  raiz?.classList.add('sale'); const r = raiz; setTimeout(() => r?.remove(), 220);
  raiz = null; paso = -1;
  if (location.hash !== '#/hexaflex') location.hash = '#/hexaflex';
  alTerminar?.();
}
function teclas(e) {
  if (e.key === 'Escape') terminar();
  else if (e.key === 'ArrowRight') ir(paso + 1);
  else if (e.key === 'ArrowLeft' && paso > 0) ir(paso - 1);
}

// Pantalla de inicio de la guía (antes del primer paso)
function portada() {
  const t = raiz.querySelector('.guia-tarjeta');
  raiz.querySelector('.guia-foco').style.opacity = '0';
  t.classList.add('portada', 'entra');
  t.innerHTML = `<img src="icons/icon.svg" alt="" class="guia-logo">
    <h2 id="guia-titulo">Te enseño Flexeo en 30 segundos</h2>
    <p>Cinco paradas rápidas por la app. Puedes saltarla y verla cuando quieras desde Ajustes.</p>
    <div class="guia-mini">${PASOS.map((p) => `<span>${icon(p.ico, 20)}<small>${esc(p.corto || p.titulo)}</small></span>`).join('')}</div>
    <button type="button" class="btn primario" data-guia="empezar">Empezar la guía</button>
    <button type="button" class="btn texto pequeno" data-guia="fin">Ahora no</button>`;
  requestAnimationFrame(colocar);
  t.querySelector('[data-guia="empezar"]').focus({ preventScroll: true });
}

export function iniciarGuia({ conPortada = true, alAcabar } = {}) {
  if (raiz) return;
  alTerminar = alAcabar;
  raiz = document.createElement('div');
  raiz.className = 'guia';
  raiz.innerHTML = '<div class="guia-capa"></div><div class="guia-foco"></div><div class="guia-tarjeta" role="dialog" aria-modal="true" aria-labelledby="guia-titulo" aria-live="polite"></div>';
  document.body.appendChild(raiz);
  raiz.addEventListener('click', (e) => {
    const b = e.target.closest('[data-guia]'); if (!b) return;
    const a = b.dataset.guia;
    if (a === 'empezar') { raiz.querySelector('.guia-tarjeta').classList.remove('portada'); ir(0); }
    else if (a === 'sig') ir(paso + 1);
    else if (a === 'atras') ir(paso - 1);
    else if (a === 'fin') terminar();
  });
  window.addEventListener('resize', colocar); window.addEventListener('scroll', colocar, true);
  document.addEventListener('keydown', teclas);
  if (location.hash !== '#/hexaflex') location.hash = '#/hexaflex';
  if (conPortada) { paso = -1; setTimeout(portada, 60); } else ir(0);
}
