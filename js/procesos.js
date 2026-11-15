// Los seis procesos del modelo de flexibilidad psicológica (Hexaflex) y su polo de inflexibilidad
export const PROCESOS = [
  { k: 'aceptacion', nombre: 'Aceptación', opuesto: 'Evitación experiencial' },
  { k: 'defusion', nombre: 'Defusión', opuesto: 'Fusión cognitiva' },
  { k: 'presente', nombre: 'Momento presente', opuesto: 'Atención rígida al pasado y al futuro' },
  { k: 'yo', nombre: 'Yo como contexto', opuesto: 'Apego al yo conceptualizado' },
  { k: 'valores', nombre: 'Valores', opuesto: 'Falta de claridad o contacto con los valores' },
  { k: 'accion', nombre: 'Acción comprometida', opuesto: 'Inacción, impulsividad o evitación persistente' },
];
export const TIPOS_FICHA = ['Metáfora', 'Ejercicio experiencial', 'Pregunta', 'Tarea para casa'];
export const PILAR = { aceptacion: 'abierto', defusion: 'abierto', presente: 'centrado', yo: 'centrado', valores: 'comprometido', accion: 'comprometido' };
export const proceso = (k) => PROCESOS.find((p) => p.k === k);
