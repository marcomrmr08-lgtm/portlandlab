# Portland Lab

App para el **Grupo Portland** de las prácticas: práctica experiencial de ACT entre compañeros, con un banco **Hexaflex** para preparar y registrar las técnicas.

App web instalable (PWA), hermana de Luria Lab. No tiene servidor propio: funciona en el navegador y se conecta con la cuenta de Google de cada persona.

## Módulos

- **Grupo Portland**
  - Sesiones y calendario: fecha, lugar, procesos, guion (apertura, rondas, cierre) y tiempos. Cada sesión se puede añadir al calendario del móvil (.ics).
  - Inscripción y roles: terapeuta, paciente o público, con plazas.
  - Rondas con temporizador: el host empareja (a mano o automáticamente) y guía la sesión con un temporizador por fases (intervención, feedback del paciente, feedback del grupo) que avisa con un pitido.
  - Feedback guiado: el paciente y el público responden a las preguntas de cada ronda. El terapeuta puede anotar la práctica en una ficha de su Hexaflex (nivel «role play»).
- **Hexaflex**: el mismo módulo que Luria Lab (teoría, fichas, práctica escrita, en audio y en role play, bibliografía). Desde Ajustes se pueden traer las fichas de Luria Lab.

## Dónde se guardan los datos

- **Datos del grupo** (sesiones, inscripciones, rondas, feedback): en una hoja de Google que crea el host en su Drive (carpeta «Portland Lab») y comparte con los invitados como Editor.
- **Datos personales** (fichas, notas, libros, grupos que sigues): en este dispositivo y en un archivo oculto del Drive de cada persona.

## Permisos de Google

`drive.file`, `drive.appdata` y `spreadsheets` (para leer y escribir la hoja del grupo, que no la crea la app de cada invitado). Sin acceso al correo.

## Puesta en marcha

1. Subir esta carpeta a un repositorio de GitHub `portlandlab` y activar GitHub Pages (rama `main`, carpeta raíz). La app queda en `https://marcomrmr08-lgtm.github.io/portlandlab/`.
2. Usa el mismo ID de cliente de Google que Luria Lab (`js/config.js`). El origen `https://marcomrmr08-lgtm.github.io` ya está autorizado.
3. En Google Cloud (proyecto de Luria Lab): en **Acceso a datos** añadir el permiso `.../auth/spreadsheets`. La Google Sheets API ya está activada.
4. Cada invitado tiene que estar en la lista de **usuarios de prueba** mientras la app esté en modo prueba.

Sin ID de cliente (`CLIENT_ID: ''`) la app funciona en **modo prueba**: todo se guarda solo en el dispositivo y en Ajustes se puede ver el grupo «como invitada».
