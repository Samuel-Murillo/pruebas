document.addEventListener("DOMContentLoaded", () => {
  const svgObject = document.getElementById("svgMapa");
  const input = document.getElementById("seatInput");
  const button = document.getElementById("searchButton");
  const info = document.getElementById("seatInfo");

  svgObject.addEventListener("load", () => {
    const svgDoc = svgObject.contentDocument;
    if (!svgDoc) {
      console.error("No se pudo acceder al contenido del SVG");
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

    // Tomar todos los rectángulos con class="cls-3"
    const seats = Array.from(svgDoc.querySelectorAll("rect.cls-3"));

    // Calcular filas y columnas automáticamente
    const cols = 26; // ajusta este valor según corresponda
    const rows = Math.ceil(seats.length / cols);

    // Asignar número, fila y columna a cada rect
    seats.forEach((rect, i) => {
      const seatNum = i + 1;
      rect.setAttribute("data-seat", seatNum);
      rect.setAttribute("data-row", Math.floor(i / cols) + 1);
      rect.setAttribute("data-col", (i % cols) + 1);
    });

    function marcarAsiento(numero) {
      while (overlay.firstChild) overlay.removeChild(overlay.firstChild);

      const seat = svgDoc.querySelector(`rect[data-seat='${numero}']`);
      if (!seat) {
        info.textContent = `❌ Asiento ${numero} no encontrado`;
        return;
      }

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
      const num = parseInt(input.value);
      if (isNaN(num)) {
        info.textContent = "⚠️ Ingresa un número válido";
        return;
      }
      marcarAsiento(num);
    });
  });
});
