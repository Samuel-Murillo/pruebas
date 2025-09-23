function seleccionarAsiento() {
  const numero = parseInt(document.getElementById("asientoInput").value);
  const svgDoc = document.getElementById("svgMapa").contentDocument;

  if (!numero || numero < 1 || numero > 364) {
    document.getElementById("info").innerText = "Número de asiento inválido.";
    return;
  }

  // Limpia X previas
  const oldMarks = svgDoc.querySelectorAll(".marcaX");
  oldMarks.forEach(m => m.remove());

  // Busca el asiento
  const asiento = svgDoc.getElementById(numero);
  if (asiento) {
    const bbox = asiento.getBBox(); // obtener posición y tamaño

    // Dibujar X encima
    const svgNS = "http://www.w3.org/2000/svg";
    const line1 = document.createElementNS(svgNS, "line");
    const line2 = document.createElementNS(svgNS, "line");

    // Coordenadas de la X
    line1.setAttribute("x1", bbox.x);
    line1.setAttribute("y1", bbox.y);
    line1.setAttribute("x2", bbox.x + bbox.width);
    line1.setAttribute("y2", bbox.y + bbox.height);

    line2.setAttribute("x1", bbox.x + bbox.width);
    line2.setAttribute("y1", bbox.y);
    line2.setAttribute("x2", bbox.x);
    line2.setAttribute("y2", bbox.y + bbox.height);

    // Estilo de la X
    [line1, line2].forEach(line => {
      line.setAttribute("stroke", "red");
      line.setAttribute("stroke-width", "4");
      line.setAttribute("class", "marcaX");
    });

    // Insertar dentro del SVG
    asiento.parentNode.appendChild(line1);
    asiento.parentNode.appendChild(line2);

    // Calcular fila y columna (26 columnas por fila)
    const columnas = 26;
    const fila = Math.ceil(numero / columnas);
    const columna = ((numero - 1) % columnas) + 1;

    document.getElementById("info").innerText = `Asiento ${numero} → Fila ${fila}, Columna ${columna}`;
  } else {
    document.getElementById("info").innerText = "No se encontró el asiento en el mapa.";
  }
}
