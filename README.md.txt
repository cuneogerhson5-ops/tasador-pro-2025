# Tasador Inmobiliario Pro

Aplicación web estática (HTML/CSS/JS) para tasar departamentos, casas y terrenos en Perú con validación de licencia anual, lectura de valor por m² desde Google Sheets y flujo de compra semiautomática con emisión de licencia vía Google Apps Script.

## Estructura
- index.html: Interfaz y formularios.
- style.css: Estilos modernos y responsivos.
- script.js: Lógica de licencia, compra y cálculo.
- Backend (Apps Script): Endpoints para validar licencia, emitir licencia y exponer tarifario JSON.

## Requisitos
- Cuenta Google para crear la hoja y el Apps Script.
- Hosting estático opcional: GitHub Pages, Netlify o Vercel.

## 1) Crear Google Sheets
1. Hoja “Licenses” con columnas:
   - A: licenseId
   - B: email
   - C: activatedAt (ISO)
   - D: expiresAt (ISO)
   - E: active (TRUE/FALSE)
   - F: notes
2. Hoja “Tariffs” con columnas:
   - A: tipo (Departamento/Casa/Terreno)
   - B: distrito
   - C: subzona
   - D: valorM2 (numérico)

## 2) Apps Script (backend)
1. En el menú de la hoja: Extensiones > Apps Script.
2. Crea un proyecto con un archivo `Code.gs` y pega el siguiente código:

