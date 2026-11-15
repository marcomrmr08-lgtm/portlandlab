# Seguridad y privacidad de Portland Lab

- Sin servidor ni base de datos propios: cada persona guarda sus datos en su dispositivo y en su propio Google Drive.
- Permisos de Google mínimos: `drive.file` (solo archivos que crea la app) y `drive.appdata` (su archivo oculto). Sin acceso al correo.
- El acceso de Google dura una hora y solo se guarda en la memoria de la página.
- **Política de seguridad (CSP)** en `index.html`: solo código de la propia app y del inicio de sesión de Google; solo conexiones con Google.
- **Texto siempre escapado** con `esc()`; los datos que llegan de Drive o de Luria Lab se sanean al cargar (`sanear()` en `js/store.js`).
- En el diario y las fichas, nunca datos que identifiquen a pacientes.
