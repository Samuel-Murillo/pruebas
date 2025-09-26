document.addEventListener("DOMContentLoaded", () => {

  // Verificación de elementos
  const svgObject = document.getElementById("svgMapa");
  const input = document.getElementById("seatInput");
  const button = document.getElementById("searchButton");
  const info = document.getElementById("seatInfo");
  const nameInput = document.getElementById("nameInput");
  const surnameInput = document.getElementById("surnameInput");
  const searchByNameBtn = document.getElementById("searchByName");
  const nameInfo = document.getElementById("nameInfo");

  if (!svgObject) {
    alert("No se encontró el objeto SVG en la página");
    return;
  }
  if (!input || !button || !info) {
    alert("No se encontraron los elementos del formulario. Verifica los IDs en index.html");
    return;
  }

  // Variables compartidas entre el init del SVG y las funciones de marcado
  let overlay = null;
  let svgDocRef = null; // referencia al documento SVG para usarla fuera de initSvg
  let lastSeat = null;

  svgObject.addEventListener("load", () => {
    // evitar que cualquier <form> haga submit y recargue la página (evita parpadeo de mensajes)
    try { document.querySelectorAll('form').forEach(f => f.addEventListener('submit', e => e.preventDefault())); } catch(e) {}
    // Crear helper initSvg para poder invocarlo también si el SVG ya está disponible
    function initSvg(svgDoc) {
      if (!svgDoc) {
        console.error("initSvg: svgDoc nulo");
        info.textContent = "❌ No se pudo cargar el mapa de asientos.";
        return;
      }
      try {
        const svgRoot = svgDoc.documentElement;
        // guardar la referencia del documento SVG en scope superior
        svgDocRef = svgDoc;
        overlay = svgDoc.getElementById("overlay-marks");
        if (!overlay) {
          overlay = svgDoc.createElementNS("http://www.w3.org/2000/svg", "g");
          overlay.setAttribute("id", "overlay-marks");
          overlay.setAttribute("stroke", "red");
          overlay.setAttribute("stroke-width", "2");
          svgRoot.appendChild(overlay);
        }

        // Intentar detectar el contorno (borde negro grueso) que delimita el bloque de asientos
        let seatingBBox = null;
        try {
          const allElems = Array.from(svgDoc.querySelectorAll('*'));
          function getStrokeWidth(el){
            try {
              const win = svgDoc.defaultView || window;
              const cs = win.getComputedStyle(el);
              const sw = cs && cs.getPropertyValue('stroke-width');
              if (sw) return parseFloat(sw) || 0;
            } catch(e){}
            return parseFloat(el.getAttribute('stroke-width')) || 0;
          }
          // buscar elementos con stroke oscuro y ancho grande
          const borderCandidates = allElems.map(el => {
            const stroke = (el.getAttribute && el.getAttribute('stroke')) || '';
            const sw = getStrokeWidth(el);
            return { el, stroke: (stroke||'').toString().toLowerCase(), sw };
          }).filter(o => o.sw >= 4 && (o.stroke === 'black' || o.stroke === '#000' || o.stroke === '#000000' || o.stroke === '' ));
          if (borderCandidates.length) {
            // seleccionar el que tiene mayor área de bbox
            let best = null; let bestArea = 0;
            for (const bc of borderCandidates) {
              try {
                const bb = bc.el.getBBox();
                const area = bb.width * bb.height;
                if (area > bestArea) { bestArea = area; best = { el: bc.el, bb }; }
              } catch(e) { /* skip */ }
            }
            if (best) {
              seatingBBox = best.bb;
              // reducir un poco la caja para excluir el stroke
              seatingBBox.x += Math.max(2, Math.floor(bestArea? (Math.min(best.bb.width,best.bb.height)*0.005) : 2));
              seatingBBox.y += Math.max(2, Math.floor(bestArea? (Math.min(best.bb.width,best.bb.height)*0.005) : 2));
              seatingBBox.width = Math.max(0, best.bb.width - 4);
              seatingBBox.height = Math.max(0, best.bb.height - 4);
              console.log('initSvg: detectado borde contenedor, bbox approximada:', seatingBBox);
            }
          }
        } catch(e) {
          console.warn('initSvg: error detectando borde contenedor:', e);
        }

            // Detectar todos los rects candidatos (incluir todos los rect por seguridad) y tomar medidas
            const allRects = Array.from(svgDoc.querySelectorAll("rect"));
    function isWhiteish(fill) {
      if (!fill) return true;
      const f = (fill||'').toString().trim().toLowerCase();
      if (f === 'none' || f === '') return true;
      if (f === '#fff' || f === '#ffffff' || f === 'white' || f === 'rgb(255,255,255)' || f === 'rgb(255, 255, 255)') return true;
      return false;
    }

    function parseHex(hex) {
      if (!hex) return null;
      const h = hex.trim().replace('#','');
      if (h.length === 3) {
        const r = parseInt(h[0]+h[0],16);
        const g = parseInt(h[1]+h[1],16);
        const b = parseInt(h[2]+h[2],16);
        return [r,g,b];
      }
      if (h.length === 6) {
        const r = parseInt(h.slice(0,2),16);
        const g = parseInt(h.slice(2,4),16);
        const b = parseInt(h.slice(4,6),16);
        return [r,g,b];
      }
      return null;
    }

    function looksGreenish(colorStr) {
      if (!colorStr) return false;
      const s = colorStr.toString().trim().toLowerCase();
      if (s.includes('green')) return true;
      if (s.startsWith('rgb')) {
        const nums = s.replace(/[rgba()\s]/g,'').split(',').map(x=>parseInt(x||0));
        if (nums.length>=3) {
          const [r,g,b] = nums;
          return (g > r + 10 && g > b + 10);
        }
      }
      if (s.startsWith('#')) {
        const rgb = parseHex(s);
        if (rgb) {
          const [r,g,b] = rgb;
          return (g > r + 10 && g > b + 10);
        }
      }
      return false;
    }

    const rectInfos = allRects.map(r => {
      const x = parseFloat(r.getAttribute("x")) || 0;
      const y = parseFloat(r.getAttribute("y")) || 0;
      const w = parseFloat(r.getAttribute("width")) || 0;
      const h = parseFloat(r.getAttribute("height")) || 0;
      const cx = x + w / 2;
      const cy = y + h / 2;
      const fill = r.getAttribute("fill");
      const stroke = r.getAttribute('stroke');
      const isLabelFill = !isWhiteish(fill) || looksGreenish(stroke);
      return { r, x, y, w, h, cx, cy, fill, isLabelFill };
    });

    // Filtrar por tamaño: calcular mediana de anchuras/alturas y mantener rects similares
    function median(values) {
      const s = values.slice().sort((a,b)=>a-b);
      const m = Math.floor(s.length/2);
      return s.length%2===0 ? (s[m-1]+s[m])/2 : s[m];
    }
    const widths = rectInfos.map(i=>i.w).filter(v=>v>0);
    const heights = rectInfos.map(i=>i.h).filter(v=>v>0);
    const medW = widths.length ? median(widths) : 0;
    const medH = heights.length ? median(heights) : 0;

    const sizeTol = 0.6; // aceptar entre 60% y 140% del tamaño medio
    // Filtrar solo por tamaño similar (más inclusivo). Esto evita excluir asientos por fill.
    let candidates = rectInfos.filter(i => {
      if (!i.w || !i.h) return false;
      const szOk = i.w >= medW*sizeTol && i.w <= medW*(2-sizeTol) && i.h >= medH*sizeTol && i.h <= medH*(2-sizeTol);
      return szOk;
    });

    // Excluir rects con relleno claramente no-blanco (etiquetas verdes), pero hacer fallback
    const before = candidates.length;
    const filteredByFill = candidates.filter(c => !c.isLabelFill);
    if (filteredByFill.length >= Math.max(8, Math.round(before*0.5))) {
      candidates = filteredByFill;
      console.log(`initSvg: excluidos ${before - candidates.length} rects por color de relleno (probables etiquetas)`);
    } else {
      console.log('initSvg: no se aplicó filtro por color porque habría quedado muy pocos candidatos');
    }

    // Filtrar por banda horizontal principal (excluir etiquetas en el margen izquierdo/derecho)
    try {
      const xs = candidates.map(c=>c.cx).sort((a,b)=>a-b);
      const n = xs.length;
      if (n > 6) {
        const leftIdx = Math.max(0, Math.floor(n * 0.04));
        const rightIdx = Math.min(n-1, Math.ceil(n * 0.96));
        const leftBound = xs[leftIdx];
        const rightBound = xs[rightIdx];
        const horizFiltered = candidates.filter(c => c.cx >= leftBound && c.cx <= rightBound);
        if (horizFiltered.length >= Math.max(8, Math.round(candidates.length * 0.6))) {
          console.log(`initSvg: filtrados ${candidates.length - horizFiltered.length} rects por estar fuera de la banda horizontal principal`);
          candidates = horizFiltered;
        } else {
          console.log('initSvg: filtro horizontal no aplicado (habría quedado muy pocos candidatos)');
        }
      }
    } catch (e) {
      console.warn('initSvg: error aplicando filtro horizontal:', e);
    }

    // Si detectamos seatingBBox, filtrar los candidatos por estar dentro de esa caja
    try {
      // Si seatingBBox no fue detectado arriba, construir una bbox fallback basada
      // en percentiles horizontales y la banda vertical estimada.
      if (!seatingBBox) {
        try {
          const xsAll = candidates.map(c=>c.cx).sort((a,b)=>a-b);
          const n = xsAll.length;
          if (n>6) {
            const leftIdx = Math.max(0, Math.floor(n * 0.04));
            const rightIdx = Math.min(n-1, Math.ceil(n * 0.96));
            const leftBound = xsAll[leftIdx];
            const rightBound = xsAll[rightIdx];
            // vertical band: reuse densest window approach
            const cys = candidates.map(c=>c.cy).sort((a,b)=>a-b);
            const K = Math.max(1, Math.round(cys.length * 0.6));
            let bestI = 0, bestRange = Infinity;
            for (let i=0;i+K-1<cys.length;i++){
              const range = cys[i+K-1]-cys[i]; if (range<bestRange){ bestRange=range; bestI=i; }
            }
            const cyMin = cys[bestI];
            const cyMax = cys[Math.min(cys.length-1,bestI+K-1)];
            const bandTol = Math.max(4, medH * 0.5);
            seatingBBox = { x: leftBound - 1, y: cyMin - bandTol, width: (rightBound - leftBound) + 2, height: (cyMax - cyMin) + bandTol*2 };
            console.log('initSvg: seatingBBox fallback construido:', seatingBBox);
          }
        } catch(e) { console.warn('initSvg: error construyendo seatingBBox fallback', e); }
      }

      if (seatingBBox) {
        const preBBox = candidates.length;
        const beforeCandidates = candidates.slice();
        const bbMinX = seatingBBox.x;
        const bbMaxX = seatingBBox.x + seatingBBox.width;
        const bbMinY = seatingBBox.y;
        const bbMaxY = seatingBBox.y + seatingBBox.height;
        const bboxFiltered = candidates.filter(c => (c.cx >= bbMinX && c.cx <= bbMaxX && c.cy >= bbMinY && c.cy <= bbMaxY));
        if (bboxFiltered.length >= Math.max(8, Math.round(preBBox * 0.5))) {
          candidates = bboxFiltered;
          console.log(`initSvg: aplicó filtro por seatingBBox, candidatos: ${preBBox} -> ${candidates.length}`);
        } else {
          console.log('initSvg: filtro seatingBBox no aplicado (reduciría demasiado los candidatos)');
        }
      } else {
        console.log('initSvg: seatingBBox no detectado, no se aplica filtro por contenedor');
      }
    } catch (e) {
      console.warn('initSvg: error aplicando filtro seatingBBox:', e);
    }

    if (candidates.length === 0) {
      info.textContent = "❌ No se detectaron asientos válidos en el SVG.";
      return;
    }

    // Antes de agrupar en filas: extraer el componente conectado más grande
    try {
      const adjTolX = Math.max(6, medW * 1.5);
      const adjTolY = Math.max(6, medH * 1.5);
      const n = candidates.length;
      if (n > 0) {
        // construir lista de vecinos
        const visited = new Array(n).fill(false);
        const comps = [];
        for (let i=0;i<n;i++) {
          if (visited[i]) continue;
          const stack = [i]; visited[i]=true; const comp = [candidates[i]];
          while (stack.length) {
            const u = stack.pop();
            for (let v=0; v<n; v++) {
              if (visited[v]) continue;
              const dx = Math.abs(candidates[u].cx - candidates[v].cx);
              const dy = Math.abs(candidates[u].cy - candidates[v].cy);
              if (dx <= adjTolX && dy <= adjTolY) {
                visited[v]=true; stack.push(v); comp.push(candidates[v]);
              }
            }
          }
          comps.push(comp);
        }
        comps.sort((a,b)=>b.length-a.length);
        if (comps.length) {
          const mainComp = comps[0];
          if (mainComp.length >= Math.max(8, Math.round(candidates.length * 0.5))) {
            candidates = mainComp.slice();
            console.log(`initSvg: seleccionado componente principal con ${candidates.length} candidatos (de ${n})`);
          } else {
            console.log('initSvg: componente principal no suficiente, manteniendo candidatos originales');
          }
        }
      }
    } catch(e) { console.warn('initSvg: error seleccionando componente principal', e); }

    // Agrupar por cy (centro Y) usando tolerancia basada en mediana de altura
    const tol = Math.max(4, medH*0.5);
    const rows = [];
    candidates.forEach(ci => {
      let found = false;
      for (const row of rows) {
        if (Math.abs(row.cy - ci.cy) <= tol) {
          row.items.push(ci);
          row.cy = (row.cy * (row.items.length-1) + ci.cy) / row.items.length; // actualizar rep cy
          found = true;
          break;
        }
      }
      if (!found) rows.push({ cy: ci.cy, items: [ci] });
    });

    // Mantener solo filas con muchos asientos (descartar filas ruidosas)
    const maxCount = Math.max(...rows.map(r=>r.items.length));
    const validRows = rows.filter(r => r.items.length >= Math.max(4, Math.round(maxCount*0.4)));
    if (validRows.length === 0) {
      info.textContent = "❌ No se encontraron filas consistentes de asientos.";
      return;
    }

    // Ordenar filas por cy descendente (bottom -> top)
    validRows.sort((a,b) => b.cy - a.cy);

    // Excluir filas de etiquetas (recuadros verdes) buscando la banda vertical
    // que contiene la mayoría de los centros de los rects (densest-cy-window).
    let seatingRows = validRows;
    try {
      const allCys = candidates.map(c => c.cy).sort((a,b)=>a-b);
      const total = allCys.length;
      if (total > 0) {
        // Queremos cubrir la franja que contiene al menos el 60% de los rects
        const K = Math.max(1, Math.round(total * 0.6));
        let bestI = 0, bestRange = Infinity;
        for (let i = 0; i + K - 1 < total; i++) {
          const range = allCys[i+K-1] - allCys[i];
          if (range < bestRange) { bestRange = range; bestI = i; }
        }
        const cyMin = allCys[bestI];
        const cyMax = allCys[Math.min(total-1, bestI + K - 1)];
        const bandTol = Math.max(4, medH * 0.5);
        const bandMin = cyMin - bandTol;
        const bandMax = cyMax + bandTol;
        const filtered = validRows.filter(r => r.cy >= bandMin && r.cy <= bandMax);
        if (filtered.length >= Math.max(1, Math.round(validRows.length * 0.3))) {
          seatingRows = filtered;
          console.log(`initSvg: seleccionada banda vertical cy in [${Math.round(bandMin)},${Math.round(bandMax)}] con ${seatingRows.length} filas para numerar (de ${validRows.length})`);
        } else {
          console.log('initSvg: banda vertical no suficiente, usando todas las filas detectadas');
        }
      }
    } catch (e) {
      console.warn('initSvg: error aplicando filtro por banda vertical:', e);
    }

    // Numerar: iterar filas bottom->top y dentro de cada fila ordenar por cx asc
    let seatIndex = 0;
    seatingRows.forEach((rowObj, rowIdx) => {
      const sorted = rowObj.items.sort((a,b) => a.cx - b.cx);
      sorted.forEach((ci, colIdx) => {
        seatIndex += 1;
        ci.r.setAttribute("data-seat", seatIndex);
        ci.r.setAttribute("data-row", rowIdx+1);
        ci.r.setAttribute("data-col", colIdx+1);
        // guardar color original
        const orig = ci.r.getAttribute("data-orig-fill");
        if (!orig) ci.r.setAttribute("data-orig-fill", ci.r.getAttribute("fill") || "#ffffff");
      });
    });

    // Diagnóstico y corrección: garantizar que data-seat='1' sea la esquina inferior-izquierda
    try {
      // eliminar debug previo si existe
      try { const prev = svgDoc.getElementById('debug-seat1'); if (prev && prev.parentNode) prev.parentNode.removeChild(prev); } catch(e){}

      // elegir candidato bottom-left dentro del bloque principal
      let desiredRect = null;
      try {
        if (seatingRows && seatingRows.length) {
          const bottom = seatingRows[0]; // ya ordenadas bottom->top
          // ordenar por cx asc y preferir los que no parecen etiquetas
          const sorted = bottom.items.slice().sort((a,b)=>a.cx - b.cx);
          desiredRect = sorted.find(it => !it.isLabelFill)?.r || sorted[0].r;
        } else if (candidates && candidates.length) {
          // fallback: elegir el rect con mayor cy (más abajo) y luego menor cx
          const sortedAll = candidates.slice().sort((a,b)=> { if (b.cy!==a.cy) return b.cy-a.cy; return a.cx-b.cx; });
          desiredRect = sortedAll.find(it => !it.isLabelFill)?.r || sortedAll[0].r;
        }
      } catch(e) { console.warn('diagnóstico: error eligiendo desiredRect', e); }

      const seat1 = svgDoc.querySelector("rect[data-seat='1']");
      if (desiredRect && seat1 && seat1 !== desiredRect) {
        // intercambiar atributos data-seat, data-row, data-col entre seat1 y desiredRect
        try {
          const r1 = seat1;
          const r2 = desiredRect;
          const r1Seat = r1.getAttribute('data-seat');
          const r1Row = r1.getAttribute('data-row');
          const r1Col = r1.getAttribute('data-col');
          const r2Seat = r2.getAttribute('data-seat');
          const r2Row = r2.getAttribute('data-row');
          const r2Col = r2.getAttribute('data-col');
          // swap
          r1.setAttribute('data-seat', r2Seat);
          r1.setAttribute('data-row', r2Row);
          r1.setAttribute('data-col', r2Col);
          r2.setAttribute('data-seat', r1Seat);
          r2.setAttribute('data-row', r1Row);
          r2.setAttribute('data-col', r1Col);
          console.log('diagnóstico: intercambiados atributos para que asiento1 sea bottom-left');
        } catch(e) { console.warn('diagnóstico: error intercambiando asientos', e); }
      }

      // ahora localizar quien es seat1 final y dibujar debug rect
      const finalSeat1 = svgDoc.querySelector("rect[data-seat='1']");
      if (finalSeat1) {
        const sx = finalSeat1.getAttribute('x');
        const sy = finalSeat1.getAttribute('y');
        const sw = finalSeat1.getAttribute('width');
        const sh = finalSeat1.getAttribute('height');
        const sf = finalSeat1.getAttribute('fill');
        console.log(`diagnóstico: asiento1 -> x=${sx}, y=${sy}, w=${sw}, h=${sh}, fill=${sf}`);
        try {
          if (overlay) {
            const dbg = svgDoc.createElementNS('http://www.w3.org/2000/svg','rect');
            dbg.setAttribute('x', sx);
            dbg.setAttribute('y', sy);
            dbg.setAttribute('width', sw);
            dbg.setAttribute('height', sh);
            dbg.setAttribute('fill', 'none');
            dbg.setAttribute('stroke', 'blue');
            dbg.setAttribute('stroke-width', '3');
            dbg.setAttribute('id', 'debug-seat1');
            overlay.appendChild(dbg);
          }
        } catch(e) { console.warn('diagnóstico: no se pudo dibujar debug rect', e); }
      } else {
        console.log('diagnóstico: no se asignó data-seat=1 a ningún rect (final)');
      }
    } catch(e) { console.warn('diagnóstico: error al localizar/ajustar asiento1', e); }

        // Debug: construir resumen de filas detectadas
        const rowSummaries = validRows.map((r, i) => `fila${i+1}:cy=${Math.round(r.cy)} count=${r.items.length}`);
        const firstAssigned = svgDoc.querySelector("rect[data-seat='1']");
        let debugMsg = `Asignados ${seatIndex} asientos. Filas detectadas: ${rowSummaries.length}. `;
        debugMsg += rowSummaries.join(' | ');
        if (firstAssigned) {
          const fx = firstAssigned.getAttribute('x');
          const fy = firstAssigned.getAttribute('y');
          debugMsg += ` → Asiento1 x=${fx}, y=${fy}`;
        }
  // No mostrar debug en pantalla; dejar el área de info limpia y enviar debug a la consola
  info.textContent = '';
  console.log(debugMsg);

    // Fallback agresivo: si tras la corrección seat1 no quedó en la esquina inferior-izquierda,
    // renumerar todo por posición absoluta usando una tolerancia más estricta.
    try {
      const finalSeat = svgDoc.querySelector("rect[data-seat='1']");
      let needForce = false;
      if (finalSeat) {
        const fx = parseFloat(finalSeat.getAttribute('x')) || 0;
        const fy = parseFloat(finalSeat.getAttribute('y')) || 0;
        // definir la esquina inferior-izquierda esperada: máxima cy (y+h) y mínima cx
        // calcular candidato absoluto: entre 'candidates' elegir el de mayor (cy) y menor (cx)
        if (candidates && candidates.length) {
          const absSorted = candidates.slice().sort((a,b) => {
            const ay = (a.y + a.h) - (b.y + b.h);
            if (ay !== 0) return ay; // mayor y+h primero (más abajo)
            return a.cx - b.cx; // luego menor cx
          });
          const absBest = absSorted[0];
          const absX = absBest.x;
          const absY = absBest.y;
          // si finalSeat no coincide con absBest (por distancia), forzar renumeración
          if (Math.abs(fx - absX) > Math.max(1, medW*0.25) || Math.abs(fy - absY) > Math.max(1, medH*0.25)) {
            needForce = true;
            console.log('initSvg: seat1 no coincide con bottom-left absoluto; forzando renumeración absoluta');
          }
        }
      } else {
        needForce = true;
      }

      if (needForce) {
        // construir lista a renumerar: preferir seatingBBox si existe, sino candidates
        const pool = seatingBBox ? (candidates.filter(c => (c.cx >= seatingBBox.x && c.cx <= seatingBBox.x + seatingBBox.width && c.cy >= seatingBBox.y && c.cy <= seatingBBox.y + seatingBBox.height))) : candidates;
        // agrupamiento estricto por cy con tol reducido
        const strictTol = Math.max(2, medH*0.35);
        const strictRows = [];
        pool.forEach(ci => {
          let matched = false;
          for (const r of strictRows) {
            if (Math.abs(r.cy - ci.cy) <= strictTol) {
              r.items.push(ci);
              r.cy = (r.cy * (r.items.length-1) + ci.cy) / r.items.length;
              matched = true; break;
            }
          }
          if (!matched) strictRows.push({ cy: ci.cy, items: [ci] });
        });
        // ordenar filas bottom->top
        strictRows.sort((a,b) => b.cy - a.cy);
        // dentro de cada fila ordenar por cx asc y renumerar
        let forcedIndex = 0;
        strictRows.forEach((r, ri) => {
          const sorted = r.items.slice().sort((a,b) => a.cx - b.cx);
          sorted.forEach((ci, ciIdx) => {
            forcedIndex += 1;
            ci.r.setAttribute('data-seat', forcedIndex);
            ci.r.setAttribute('data-row', ri+1);
            ci.r.setAttribute('data-col', ciIdx+1);
          });
        });
        console.log(`initSvg: renumeración forzada completada: ${forcedIndex} asientos reasignados`);
        // actualizar debug rect para seat1
        try { const prev = svgDoc.getElementById('debug-seat1'); if (prev && prev.parentNode) prev.parentNode.removeChild(prev); } catch(e){}
        const newSeat1 = svgDoc.querySelector("rect[data-seat='1']");
        if (newSeat1 && overlay) {
          const sx = newSeat1.getAttribute('x');
          const sy = newSeat1.getAttribute('y');
          const sw = newSeat1.getAttribute('width');
          const sh = newSeat1.getAttribute('height');
          try {
            const dbg2 = svgDoc.createElementNS('http://www.w3.org/2000/svg','rect');
            dbg2.setAttribute('x', sx);
            dbg2.setAttribute('y', sy);
            dbg2.setAttribute('width', sw);
            dbg2.setAttribute('height', sh);
            dbg2.setAttribute('fill', 'none');
            dbg2.setAttribute('stroke', 'blue');
            dbg2.setAttribute('stroke-width', '3');
            dbg2.setAttribute('id', 'debug-seat1');
            overlay.appendChild(dbg2);
          } catch(e) { console.warn('initSvg: no se pudo dibujar debug final', e); }
        }
      }
    } catch(e) { console.warn('initSvg: error en renumeración forzada', e); }

        // svgDocRef y overlay quedaron asignados en scope superior
      } catch (err) {
        console.error('Error initSvg:', err);
        info.textContent = '❌ Error inicializando mapa: ' + (err.message || err);
      }
    }

    // Llamar initSvg cuando el evento load se dispara
    const svgDocFromEvent = svgObject.contentDocument;
    initSvg(svgDocFromEvent);


  // Intentar inicializar inmediatamente si el SVG ya está cargado (algunos navegadores no disparan load)
  setTimeout(() => {
    try {
      const immediateDoc = svgObject.contentDocument || (svgObject.getSVGDocument && svgObject.getSVGDocument());
      if (immediateDoc) {
        console.log('SVG ya disponible, inicializando...');
        // llamar a la misma initSvg definida en el load handler: buscarla en el scope
        // para evitar duplicar lógica, re-disparar manualmente un evento load
        const evt = new Event('load');
        svgObject.dispatchEvent(evt);
      } else {
        console.log('SVG aún no disponible tras timeout');
      }
    } catch (e) {
      console.warn('Error comprobando SVG inmediato:', e);
    }
  }, 300);

    function marcarAsiento(numero) {
      try {
        if (!svgDocRef) {
          info.textContent = '❌ El mapa SVG no está inicializado.';
          return;
        }
        while (overlay && overlay.firstChild) overlay.removeChild(overlay.firstChild);

        // Restaurar color del último asiento seleccionado usando data-orig-fill si existe
        if (lastSeat) {
          const orig = lastSeat.getAttribute('data-orig-fill');
          if (orig) lastSeat.setAttribute('fill', orig);
          else lastSeat.removeAttribute('fill');
          lastSeat = null;
        }

        const seat = svgDocRef.querySelector(`rect[data-seat='${numero}']`);
        if (!seat) {
          info.textContent = `❌ Asiento ${numero} no encontrado`;
          return;
        }

        // Guardar color original si no existe
        if (!seat.getAttribute('data-orig-fill')) {
          seat.setAttribute('data-orig-fill', seat.getAttribute('fill') || '#ffffff');
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

      const line1 = svgDocRef.createElementNS("http://www.w3.org/2000/svg", "line");
      line1.setAttribute("x1", cx - offset);
      line1.setAttribute("y1", cy - offset);
      line1.setAttribute("x2", cx + offset);
      line1.setAttribute("y2", cy + offset);

      const line2 = svgDocRef.createElementNS("http://www.w3.org/2000/svg", "line");
      line2.setAttribute("x1", cx - offset);
      line2.setAttribute("y1", cy + offset);
      line2.setAttribute("x2", cx + offset);
      line2.setAttribute("y2", cy - offset);

      if (overlay) {
        overlay.appendChild(line1);
        overlay.appendChild(line2);
      }

      const row = seat.getAttribute("data-row");
      const col = seat.getAttribute("data-col");
      info.textContent = `✅ Asiento ${numero} → Fila ${row}, Columna ${col}`;
      } catch (e) {
        console.error('Error en marcarAsiento:', e);
        info.textContent = '❌ Error al marcar asiento: ' + (e && e.message ? e.message : e);
      }
    }

    button.addEventListener("click", (ev) => {
      ev.preventDefault && ev.preventDefault();
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

    // Utilidades: parse CSV y normalizar strings
    function parseCSV(text) {
      const rows = [];
      let cur = '';
      let row = [];
      let inQuotes = false;
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === '"') {
          if (inQuotes && text[i+1] === '"') { cur += '"'; i++; continue; }
          inQuotes = !inQuotes; continue;
        }
        if (ch === ',' && !inQuotes) { row.push(cur); cur = ''; continue; }
        if ((ch === '\r' || ch === '\n') && !inQuotes) {
          if (cur !== '' || row.length) { row.push(cur); rows.push(row); row = []; cur = ''; }
          // handle \r\n
          if (ch === '\r' && text[i+1] === '\n') i++;
          continue;
        }
        cur += ch;
      }
      if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
      return rows;
    }

    function normalize(s) {
        try {
          return (s||'').toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\uFE0E/g,'');
        } catch (e) {
          return (s||'').toString().trim().toLowerCase();
        }
    }

    // Intentar primero cargar CSV `nombresConAsientos.csv` (evita 404 si no existe asientos.json)
    let asientoList = null;
    fetch('nombresConAsientos.csv').then(r => {
      if (!r.ok) throw new Error('no-csv');
      return r.text();
    }).then(text => {
    // Eliminar BOM si existe
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    const rows = parseCSV(text);
      if (!rows.length) { nameInfo.textContent = '❌ CSV vacío o inválido.'; return; }
      const headers = rows[0].map(h => h.trim());
      const data = rows.slice(1).map(rw => {
        const obj = {};
        for (let i=0;i<headers.length;i++) obj[headers[i]] = (rw[i]||'').trim();
        return obj;
      });
      asientoList = data;
      console.log('Cargado CSV nombresConAsientos.csv', asientoList.length);
      nameInfo.textContent = `Cargado ${asientoList.length} entradas desde CSV.`;
    }).catch(() => {
      // Si no hay CSV, intentar asientos.json
      fetch('asientos.json').then(r => {
        if (!r.ok) throw new Error('no-json');
        return r.json();
      }).then(data => {
        asientoList = data;
        console.log('Cargado asientos.json', asientoList.length);
        nameInfo.textContent = `Cargado ${asientoList.length} entradas.`;
      }).catch(() => {
        console.log('No se encontró asientos.json ni nombresConAsientos.csv');
      });
    });

    searchByNameBtn.addEventListener('click', (ev) => {
      ev.preventDefault && ev.preventDefault();
      if (!asientoList) { nameInfo.textContent = '❌ No hay lista de asientos cargada.'; return; }
      const nombreRaw = (nameInput.value||'').trim();
      const apellidoRaw = (surnameInput.value||'').trim();
      if (!nombreRaw && !apellidoRaw) { nameInfo.textContent = '⚠️ Ingresa nombre o apellido.'; return; }
      const nombre = normalize(nombreRaw);
      const apellido = normalize(apellidoRaw);
      const found = asientoList.find(item => {
        const n = normalize(item.Nombre || item.name || item.nombre || '');
        const s = normalize(item.Apellido || item.surname || item.apellido || '');
        // coincidencia parcial: si se ingresó nombre, comprobar en campo nombre; si apellido, en apellido
        const nameMatch = !nombre || n.includes(nombre) || (n.split(' ').some(p=>p.includes(nombre)));
        const surnameMatch = !apellido || s.includes(apellido) || (s.split(' ').some(p=>p.includes(apellido)));
        return nameMatch && surnameMatch;
      });
      if (!found) { nameInfo.textContent = '❌ No se encontró la persona.'; return; }
      const seatStr = found.Asiento || found.Seat || found.seat || found.asiento || found.AsientoNum || found.number || found['Asiento '];
      const seatNum = parseInt(seatStr);
      if (!seatNum) { nameInfo.textContent = `❌ Entrada encontrada pero sin número de asiento: ${JSON.stringify(found)}`; return; }
      nameInfo.textContent = `✅ ${found.Nombre||found.name||found.nombre} ${found.Apellido||found.surname||found.apellido} → Asiento ${seatNum}`;
      marcarAsiento(seatNum);
  });
  });

  // Si el SVG no carga en 3 segundos, mostrar advertencia
  setTimeout(() => {
    if (!svgObject.contentDocument) {
      info.textContent = "⚠️ El mapa de asientos no se ha cargado. Intenta recargar la página.";
    }
  }, 3000);
});
