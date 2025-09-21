function seleccionarAsiento() {
  const numero = parseInt(document.getElementById("asientoInput").value);
  const svgDoc = document.getElementById("svgMapa").contentDocument;

  if (!numero || numero < 1 || numero > 364) {
    document.getElementById("info").innerText = "Número de asiento inválido.";
    return;
  }

  // Limpia los resaltados previos
  svgDoc.querySelectorAll(".highlight").forEach(el => el.classList.remove("highlight"));

  // Busca el asiento
  const asiento = svgDoc.getElementById(numero);
  if (asiento) {
    asiento.classList.add("highlight");

    // Calcular fila y columna (26 columnas por fila)
    const columnas = 26;
    const fila = Math.ceil(numero / columnas);
    const columna = ((numero - 1) % columnas) + 1;

    document.getElementById("info").innerText = `Asiento ${numero} → Fila ${fila}, Columna ${columna}`;
  } else {
    document.getElementById("info").innerText = "No se encontró el asiento en el mapa.";
  }
}
