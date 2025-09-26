document.addEventListener("DOMContentLoaded", () => {

  // Verificación de elementos
  const svgObject = document.getElementById("svgMapa");
  const input = document.getElementById("seatInput");
  const button = document.getElementById("searchButton");
  const info = document.getElementById("seatInfo");

  if (!svgObject) {
    alert("No se encontró el objeto SVG en la página");
    return;
  }
  if (!input || !button || !info) {
    alert("No se encontraron los elementos del formulario. Verifica los IDs en index.html");
    return;
  }

  svgObject.addEventListener("load", () => {
    const svgDoc = svgObject.contentDocument;
    if (!svgDoc) {
      console.error("No se pudo acceder al contenido del SVG");
      info.textContent = "❌ No se pudo cargar el mapa de asientos.";
      return;
    }

    const svgRoot = svgDoc.documentElement;
    let overlay = svgDoc.getElementById("overlay-marks");
    if (!overlay) {
      overlay = svgDoc.createElementNS("http://www.w3.org/2000/svg", "g");
      overlay.setAttribute("id", "overlay-marks");
      overlay.setAttribute("stroke", "red");
      overlay.setAttribute("stroke-width", "2");
      svgRoot.appendChild(overlay);
    }

    // Solo numerar los rectángulos blancos (asientos)
    // Se asume que los asientos tienen fill="#fff" o fill="white" y los verdes no
    const allRects = Array.from(svgDoc.querySelectorAll("rect.cls-3"));
    const seats = allRects.filter(rect => {
      const fill = rect.getAttribute("fill");
      return fill === "#fff" || fill === "white" || fill === null || fill === "";
    });

    // Ordenar por y (de menor a mayor, de abajo hacia arriba), luego por x (de menor a mayor, de izquierda a derecha)
    seats.sort((a, b) => {
      const ay = parseFloat(a.getAttribute("y"));
      const by = parseFloat(b.getAttribute("y"));
      if (ay !== by) return ay - by;
      const ax = parseFloat(a.getAttribute("x"));
      const bx = parseFloat(b.getAttribute("x"));
      return ax - bx;
    });

    // Determinar columnas por la estructura visual (ajusta si es necesario)
    const cols = 26;
    // Numerar por filas: primero fila 1, columna 1 a 26; luego fila 2, etc.
    seats.forEach((rect, i) => {
      const row = Math.floor(i / cols) + 1;
      const col = (i % cols) + 1;
      const seatNum = i + 1;
      rect.setAttribute("data-seat", seatNum);
      rect.setAttribute("data-row", row);
      rect.setAttribute("data-col", col);
    });


    let lastSeat = null;
    function marcarAsiento(numero) {
      while (overlay.firstChild) overlay.removeChild(overlay.firstChild);

      // Restaurar color del último asiento seleccionado
      if (lastSeat) {
        lastSeat.setAttribute("fill", "#fff"); // color original, ajusta si es necesario
      }

      const seat = svgDoc.querySelector(`rect[data-seat='${numero}']`);
      if (!seat) {
        info.textContent = `❌ Asiento ${numero} no encontrado`;
        return;
      }

      // Cambiar color del asiento seleccionado
      seat.setAttribute("fill", "#ff9800"); // naranja
      lastSeat = seat;

      const x = parseFloat(seat.getAttribute("x"));
      const y = parseFloat(seat.getAttribute("y"));
      const w = parseFloat(seat.getAttribute("width"));
      const h = parseFloat(seat.getAttribute("height"));

      const cx = x + w / 2;
      const cy = y + h / 2;
      const offset = Math.min(w, h) / 2;

      const line1 = svgDoc.createElementNS("http://www.w3.org/2000/svg", "line");
      line1.setAttribute("x1", cx - offset);
      line1.setAttribute("y1", cy - offset);
      line1.setAttribute("x2", cx + offset);
      line1.setAttribute("y2", cy + offset);

      const line2 = svgDoc.createElementNS("http://www.w3.org/2000/svg", "line");
      line2.setAttribute("x1", cx - offset);
      line2.setAttribute("y1", cy + offset);
      line2.setAttribute("x2", cx + offset);
      line2.setAttribute("y2", cy - offset);

      overlay.appendChild(line1);
      overlay.appendChild(line2);

      const row = seat.getAttribute("data-row");
      const col = seat.getAttribute("data-col");
      info.textContent = `✅ Asiento ${numero} → Fila ${row}, Columna ${col}`;
    }

    button.addEventListener("click", () => {
      if (!svgObject.contentDocument) {
        info.textContent = "❌ El mapa SVG no está disponible.";
        return;
      }
      const num = parseInt(input.value);
      if (isNaN(num)) {
        info.textContent = "⚠️ Ingresa un número válido";
        return;
      }
      marcarAsiento(num);
    });
  });

  // Si el SVG no carga en 3 segundos, mostrar advertencia
  setTimeout(() => {
    if (!svgObject.contentDocument) {
      info.textContent = "⚠️ El mapa de asientos no se ha cargado. Intenta recargar la página.";
    }
  }, 3000);
});
