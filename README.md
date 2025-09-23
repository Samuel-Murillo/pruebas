# pruebas

# 🎟️ Mapa de Asientos

Aplicación web para visualizar y buscar asientos en un mapa vectorizado (SVG).  
Permite ingresar el número de asiento y mostrarlo resaltado con una **❌**, además de indicar la **fila y la columna** correspondientes.  

Diseñado para ser **responsive**, por lo que funciona tanto en computadoras como en móviles 📱💻.  

---

## 🚀 Cómo usar

1. Ingresa el número de tu asiento en el campo de búsqueda.  
2. Haz clic en **Buscar Asiento**.  
3. El asiento aparecerá marcado con una **❌ roja** en el mapa.  
4. Se mostrará también la **fila y columna** a la que corresponde.  

---

## 📂 Estructura del proyecto

```
index.html        → Página principal
style.css         → Estilos de la aplicación (responsive)
script.js         → Lógica para resaltar asientos
mapa_ready.svg    → Archivo SVG con los asientos numerados (IDs 1–364)
```

---

## 🛠️ Requisitos

- Un navegador moderno (Chrome, Firefox, Edge, Safari).  
- El archivo `mapa_ready.svg` debe estar en la misma carpeta que `index.html`.  

⚠️ **Nota importante:** El SVG debe tener los asientos numerados como IDs (`id="1"`, `id="2"`, …, `id="364"`).  

---

## 🌍 Publicación en GitHub Pages

1. Sube todos los archivos (`index.html`, `style.css`, `script.js`, `mapa_ready.svg`) a un repositorio público.  
2. En tu repositorio de GitHub:  
   - Ve a **Settings > Pages**.  
   - En **Source**, selecciona rama `main` y carpeta `/ (root)`.  
   - Guarda los cambios.  
3. Después de unos segundos, tu página estará disponible en:  

```
https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/
```

Ejemplo:
```
https://samuel-murillo.github.io/mapa-asientos/
```

---

## 📱 Vista en móviles

- El mapa se ajusta automáticamente al ancho de la pantalla.  
- Se puede hacer **scroll horizontal** si es necesario.  
- Los botones e inputs son grandes para facilitar su uso en pantallas táctiles.  
