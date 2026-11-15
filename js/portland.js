// Grupo Portland (boceto). Recoge la idea del grupo y deja sitio para ir definiendo la dinámica.
// Las funciones (sesiones, inscripción, rondas, feedback) se desarrollarán cuando la dinámica esté clara.
// Una primera versión completa está en el historial del repositorio (commit «primera versión»).
import * as S from './store.js';
import { esc, icon } from './ui.js';
import { nav } from './comun.js';

const MODULOS = [
  ['calendario', 'Sesiones y calendario', 'Fecha, lugar y procesos que se trabajan en cada sesión.'],
  ['persona', 'Inscripción y roles', 'Quién practica como terapeuta, quién hace de paciente y quién observa.'],
  ['reloj', 'Rondas y temporizador', 'Orden de las parejas y tiempos de cada parte.'],
  ['bocadillo', 'Feedback guiado', 'Preguntas para el paciente y para el grupo, guardadas por ronda.'],
];

export function vPortland() {
  const notas = S.datos().portland?.notas || '';
  return {
    html: `<div class="pantalla">
    <div class="item-texto"><span class="marca">Diciembre – enero</span><h1 class="titulo">Grupo Portland</h1></div>
    <span class="boceto-etq">${icon('editar', 14)}Boceto: la dinámica está por definir</span>

    <section class="tarjeta"><span class="tipo c-morado">Intención</span>
      <p class="texto-largo">Un entorno de práctica experiencial sobre los procesos de ACT. Un grupo dinámico y lúdico.</p>
      <ol class="objetivos"><li>Experimentar la flexibilidad psicológica en uno mismo.</li><li>Poner en práctica habilidades para facilitar la flexibilidad psicológica en otros.</li><li>Sostenernos como grupo e interconectarnos al servicio de un objetivo común.</li></ol></section>

    <section class="tarjeta"><span class="tipo c-morado">Quién participa</span>
      <div class="roles3"><div><b>Practicantes</b><span>Hacen de terapeuta. Máximo 6.</span></div><div><b>Voluntarios</b><span>Hacen de paciente. Máximo 6.</span></div><div><b>Público</b><span>Observa y da feedback.</span></div></div></section>

    <section class="tarjeta"><span class="tipo c-morado">Cómo funciona</span>
      <div class="estructura">
        <div><b class="t">Inicio</b><span><b>Meditación guiada</b> para poner el tono.</span></div>
        <div><b class="t">30 min</b><span><b>Práctica de habilidades en pares</b><span class="sub"><span>15 min · Intervención</span><span>5 min · Feedback del paciente</span><span>10 min · Feedback del grupo</span></span></span></div>
        <div><b class="t">Cierre</b><span><b>Meditación guiada</b> u otras ideas.</span></div>
      </div></section>

    <section class="tarjeta"><label for="pl-notas" class="tipo c-morado" style="font-size:13px">Mis notas sobre la dinámica</label>
      <textarea id="pl-notas" rows="6" placeholder="Dudas, ideas, lo que quieres probar en la primera sesión…" style="border:0;padding:0">${esc(notas)}</textarea>
      <span class="mini suave">Se guarda solo. <span class="guardado c-verde" style="font-weight:700"></span></span></section>

    <h2 class="etiqueta-grupo">Lo que tendrá la app</h2>
    <div class="seccion">${MODULOS.map(([ic, t, d]) => `<div class="tarjeta modulo-pend"><span class="icono-caja bg-primario">${icon(ic, 20)}</span><span class="item-texto"><span style="font-weight:700">${t}</span><span class="pequeno suave" style="line-height:1.45">${d}</span></span><span class="insignia">Por definir</span></div>`).join('')}</div>
    </div>${nav('portland')}`,
    mount(r) {
      const t = r.querySelector('#pl-notas');
      t.addEventListener('change', () => {
        S.actualizar((s) => { s.portland = { ...(s.portland || {}), notas: t.value.trim() }; });
        const a = r.querySelector('.guardado'); if (a) { a.textContent = 'Guardado'; setTimeout(() => { a.textContent = ''; }, 1500); }
      });
    },
  };
}
