// Piezas de interfaz que comparten las secciones (Grupo Portland, Hexaflex, Ajustes)
import { esc, icon, abrirModal, cerrarModal } from './ui.js';

// app.js rellena estas funciones al arrancar (render, google, etc.)
export const ctx = { render: () => {}, google: async () => {}, conectado: () => false };

export const app = () => document.getElementById('app');
export function irA(ruta) { if (location.hash === ruta) ctx.render(); else location.hash = ruta; }

export const NAV = [['grupo', 'Grupo', 'pareja'], ['hexaflex', 'Hexaflex', 'hexa'], ['ajustes', 'Ajustes', 'ajustes']];
export const nav = (activo) => `<nav class="nav" aria-label="Secciones"><div class="nav-in">${NAV.map(([r, t, i]) =>
  `<a href="#/${r}" class="${r === activo ? 'activo' : ''}" ${r === activo ? 'aria-current="page"' : ''}>${icon(i, 24)}${t}</a>`).join('')}</div></nav>`;

const RAICES = ['#/grupo', '#/hexaflex', '#/ajustes'];
export const volver = (href, texto, derecha = '') => `<header class="cabecera" ${RAICES.includes(href) ? 'data-raiz' : ''}><div class="cabecera-izq"><a href="${href}" class="volver" aria-label="Volver">${icon('atras', 24)}</a><span class="titulo-m">${esc(texto)}</span></div>${derecha}</header>`;

export const seg = (nombre, opciones, valor) => `<div class="segmentado" role="radiogroup">${opciones.map(([v, t]) => {
  const id = `${nombre}-${v}`; return `<input type="radio" id="${id}" name="${nombre}" value="${v}" ${v === valor ? 'checked' : ''}><label for="${id}">${t}</label>`;
}).join('')}</div>`;

export function leerForm(form) {
  const fd = new FormData(form); const o = {};
  for (const [k, v] of fd.entries()) { if (k in o) { o[k] = [].concat(o[k], v); } else o[k] = v; }
  return o;
}

export function confirmar(textoTitulo, texto, boton, alAceptar) {
  abrirModal(`<h2>${esc(textoTitulo)}</h2><p class="suave" style="line-height:1.5">${esc(texto)}</p>
    <div class="botones"><button type="button" class="btn" data-cerrar>Cancelar</button><button type="button" class="btn primario" id="b-confirmar">${esc(boton)}</button></div>`, (d) => {
    d.querySelector('#b-confirmar').addEventListener('click', () => { cerrarModal(); alAceptar(); });
  });
}

export function abrirModalTexto(texto) {
  abrirModal(`<h2>Copia este enlace</h2><p class="suave pequeno">Tu navegador no deja copiar automáticamente. Selecciónalo y cópialo a mano.</p>
    <textarea readonly rows="3" style="font-size:14px">${esc(texto)}</textarea><button type="button" class="btn primario" data-cerrar>Hecho</button>`, (d) => d.querySelector('textarea').select());
}
export async function copiar(texto, aviso = 'Copiado.') {
  const { toast } = await import('./ui.js');
  try { await navigator.clipboard.writeText(texto); toast(aviso); } catch { abrirModalTexto(texto); }
}

export const vNoEncontrado = (href = '#/grupo') => ({ html: `<div class="pantalla sin-nav">${volver(href, 'No encontrado')}<p class="vacio">Esto ya no existe.</p></div>` });
