# Flexeo

App de prácticas de ACT (antes «Portland Lab»).

Se abre en el **Hexaflex**. Módulos:

- **Hexaflex** (inicio): teoría de los seis procesos, banco de fichas y práctica en tres niveles (escrito, audio y role play).
- **Biblioteca**: **apuntes en PDF** (como la Guía clínica de Luria Lab: se suben a «Flexeo/Apuntes» en tu Drive, se ordenan por temas y se leen con un visor propio que los guarda en el dispositivo) y **lecturas** (estado, por dónde vas, citas con página, reflexiones y fichas vinculadas).
- **Diario**: notas, ideas y reflexiones rápidas, con un cuadro para escribir al momento y un editor completo (fecha, título, lectura y procesos relacionados).
- **Role play**: preparador personal de intervenciones en cuatro pasos (diseñar, guion, ensayar con modo práctica y temporizador, revisar), con paso al Diario y a las fichas del Hexaflex.

App web instalable (PWA), sin servidor propio. Dirección: https://marcomrmr08-lgtm.github.io/portlandlab/

## Dónde se guardan los datos

En el dispositivo y, al conectar con Google, en un archivo oculto del Drive de cada persona (`portland-lab-datos.json`). Los PDF de la Biblioteca y los audios y vídeos del Hexaflex van a la carpeta «Flexeo» del Drive.

## Permisos de Google

`drive.file` y `drive.appdata` (mismo ID de cliente que Luria Lab, pero sin ninguna conexión con sus datos). Sin acceso al correo.

Sin ID de cliente (`CLIENT_ID: ''`) la app funciona en modo prueba: todo se guarda solo en el dispositivo.

## Derechos

© 2026 Marco Martínez. Todos los derechos reservados. Versión de prueba para uso personal de las personas invitadas. No se permite copiar, modificar ni distribuir el código ni los contenidos sin permiso del autor. Ver `LICENSE`.
