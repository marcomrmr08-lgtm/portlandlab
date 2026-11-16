# Flexeo

App de prácticas de ACT (antes «Portland Lab»), hermana de Luria Lab, con tres módulos:

- **Diario**: ideas y reflexiones con fecha, filtros, búsqueda y procesos relacionados. Incluye **Lecturas** (antes «Bibliografía» del Hexaflex): estado y por dónde vas, citas y apuntes con página, y las reflexiones y fichas que salen de cada lectura. De una cita se puede pasar directamente a una reflexión.
- **Hexaflex**: el mismo módulo que Luria Lab (teoría, fichas y práctica escrita, en audio y en role play). Desde Ajustes se pueden traer las fichas de Luria Lab.
- **Grupo Portland**: preparador personal de la intervención para el role play. Cada estrategia tiene cuatro pasos: **diseñar** (procesos, situación del paciente, objetivo y técnicas del Hexaflex), **guion** (pasos, «si se atasca… entonces…» y frases de apoyo), **ensayar** (modo práctica a pantalla completa con temporizador, y registro de ensayos) y **revisar** (feedback, qué funcionó y qué cambiar). La revisión se puede llevar al Diario y anotar en las fichas del Hexaflex como práctica en role play.

App web instalable (PWA), sin servidor propio. Dirección: https://marcomrmr08-lgtm.github.io/portlandlab/

## Dónde se guardan los datos

En el dispositivo y, al conectar con Google, en un archivo oculto del Drive de cada persona (`portland-lab-datos.json`). Los audios y vídeos del Hexaflex van a la carpeta «Flexeo» del Drive.

## Permisos de Google

Los mismos que Luria Lab: `drive.file` y `drive.appdata`. Usa el mismo ID de cliente (`js/config.js`). Sin acceso al correo.

Sin ID de cliente (`CLIENT_ID: ''`) la app funciona en modo prueba: todo se guarda solo en el dispositivo.
