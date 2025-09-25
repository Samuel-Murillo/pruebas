document.getElementById('buscarBtn').addEventListener('click', seleccionarAsiento);

function seleccionarAsiento() {
  const numero = parseInt(document.getElementById("asientoInput").value);
  const obj = document.getElementById("svgMapa");
  const svgDoc = obj.contentDocument;
  if (!svgDoc) {
    document.getElementById("info").innerText = "El SVG aún no está cargado. Espera un momento e intenta de nuevo.";
    return;
  }

  if (!numero || numero < 1) {
    document.getElementById("info").innerText = "Número de asiento inválido.";
    return;
  }

  // Limpiar marcas previas
  const prev = svgDoc.getElementById('overlay-marks');
  if (prev) { while (prev.firstChild) prev.removeChild(prev.firstChild); }

  // Buscar elemento por id (asientos numerados dentro del SVG)
  const asiento = svgDoc.getElementById(String(numero));
  if (!asiento) {
    document.getElementById("info").innerText = "No se encontró el asiento en el mapa.";
    return;
  }

  // Obtener coordenadas: si es rect y tiene x,y,width,height, usar esos valores
  let x=0,y=0,w=0,h=0;
  if (asiento.tagName === 'rect' && asiento.hasAttribute('x')) {
    x = parseFloat(asiento.getAttribute('x'));
    y = parseFloat(asiento.getAttribute('y'));
    w = parseFloat(asiento.getAttribute('width'));
    h = parseFloat(asiento.getAttribute('height'));
  } else {
    const bbox = asiento.getBBox();
    x = bbox.x; y = bbox.y; w = bbox.width; h = bbox.height;
  }

  const cx = x + w/2;
  const cy = y + h/2;
  const size = Math.max(12, Math.min( Math.max(w,h) * 1.1, 80 )) / 2;

  const svgRoot = svgDoc.documentElement;
  // create overlay group if not exists
  let overlay = svgDoc.getElementById('overlay-marks');
  if (!overlay) {
    overlay = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'g');
    overlay.setAttribute('id','overlay-marks');
    svgRoot.appendChild(overlay);
  }

  // Create lines for X
  const svgNS = 'http://www.w3.org/2000/svg';
  const line1 = svgDoc.createElementNS(svgNS, 'line');
  const line2 = svgDoc.createElementNS(svgNS, 'line');

  line1.setAttribute('x1', cx - size);
  line1.setAttribute('y1', cy - size);
  line1.setAttribute('x2', cx + size);
  line1.setAttribute('y2', cy + size);

  line2.setAttribute('x1', cx + size);
  line2.setAttribute('y1', cy - size);
  line2.setAttribute('x2', cx - size);
  line2.setAttribute('y2', cy + size);

  line1.setAttribute('class','marcaX');
  line2.setAttribute('class','marcaX');

  overlay.appendChild(line1);
  overlay.appendChild(line2);

  // Mostrar fila y columna (si existen los atributos data-row y data-col)
  const row = asiento.getAttribute('data-row');
  const col = asiento.getAttribute('data-col');
  if (row && col) {
    document.getElementById('info').innerText = Asiento ${numero} → Fila ${row}, Columna ${col};
  } else {
    document.getElementById('info').innerText = 'Asiento ' + numero;
  }
}
