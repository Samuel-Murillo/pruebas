# 🎟️ Mapa de Asientos (corregido)

Se corrigió el orden de numeración para que los asientos estén numerados por filas (row-major),
excluyendo elementos que no son asientos (los recuadros verdes). Además la marca 'X' se dibuja
en un grupo de overlay y su tamaño es coherente con el tamaño del asiento.

Archivos incluidos:
- index.html
- style.css
- script.js
- mapa_ready_fixed.svg (SVG con IDs asignados fila-columna)

Generar `asientos.json` desde Excel:

1) Instalar Node.js si no está instalado.
2) Abrir una terminal en la carpeta del proyecto.
3) Instalar la dependencia: `npm install xlsx`.
4) Ejecutar:

	node tools/convert_xlsx_to_json.js listado_asientos.xlsx asientos.json

5) Abrir `index.html` en el navegador. La búsqueda por nombre usará `asientos.json`.

El Excel debe tener columnas `Nombre`, `Apellido`, `Asiento` (o variantes `name`, `surname`, `seat`).
