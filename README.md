# Portland Lab

App de prácticas, hermana de Luria Lab, con tres módulos:

- **Diario**: ideas y reflexiones, con fecha, filtros (ideas y reflexiones), búsqueda y relación con los procesos del Hexaflex.
- **Hexaflex**: el mismo módulo que Luria Lab (teoría, fichas, práctica escrita, en audio y en role play, bibliografía). Desde Ajustes se pueden traer las fichas de Luria Lab.
- **Grupo Portland** (boceto): intención, participantes, estructura de la sesión y un espacio de notas para ir definiendo la dinámica. Las funciones del grupo (sesiones, inscripción, rondas con temporizador y feedback) se desarrollarán cuando la dinámica esté clara. Hay una primera versión completa en el historial de este repositorio (primer commit).

App web instalable (PWA), sin servidor propio. Dirección: https://marcomrmr08-lgtm.github.io/portlandlab/

## Dónde se guardan los datos

En el dispositivo y, al conectar con Google, en un archivo oculto del Drive de cada persona (`portland-lab-datos.json`). Los audios y vídeos del Hexaflex van a la carpeta «Portland Lab» del Drive.

## Permisos de Google

Los mismos que Luria Lab: `drive.file` y `drive.appdata`. Usa el mismo ID de cliente (`js/config.js`). Sin acceso al correo.

Sin ID de cliente (`CLIENT_ID: ''`) la app funciona en modo prueba: todo se guarda solo en el dispositivo.
