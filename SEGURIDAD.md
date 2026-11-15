# Seguridad y privacidad de Portland Lab

## Cómo está montada
- Sin servidor ni base de datos propios. El grupo vive en una hoja de Google del host; los datos personales, en el Drive de cada persona.
- Permisos de Google: `drive.file` (solo archivos que crea la app), `drive.appdata` (su archivo oculto) y `spreadsheets` (la hoja del grupo). Sin acceso al correo.
- El acceso de Google dura una hora y solo se guarda en la memoria de la página.
- La app no envía correos ni comparte archivos: el host comparte la hoja desde Google Drive.

## Protecciones en el código
- **Política de seguridad (CSP)** en `index.html`: solo código de la propia app y del inicio de sesión de Google; solo conexiones con Google.
- **Texto siempre escapado** con `esc()`.
- **La hoja del grupo se trata como no fiable** (cualquier invitado puede editarla): `grupo.js` descarta filas con identificadores, correos, fechas u horas con formato extraño.
- **Se escribe como texto** (`valueInputOption=RAW`): nada de lo que escribe un usuario se interpreta como fórmula.
- **No se borran filas**: se marcan como borradas, para que varias personas puedan escribir a la vez sin pisarse.

## Límites que conviene saber
- Los permisos de la hoja los decide Google Drive: un invitado con permiso de Editor puede, abriendo la hoja, cambiar cualquier dato. La app solo oculta en su interfaz lo que es del host.
- El feedback lo puede leer todo el grupo. Pide que sea descriptivo y sin datos de pacientes reales: en los role plays solo casos inventados o «real plays» ligeros.
