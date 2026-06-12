// Importamos la función directamente del paquete de npm
import { createClient } from '@supabase/supabase-js'

// Inicializamos con tus llaves
const supabaseUrl = 'https://vyqoxoxgvatdvjyxtnom.supabase.co';
const supabaseKey = 'sb_publishable_yT9IPHfCN4AY4OK7fpkUyQ_CujLEU4r';
const supabase = createClient(supabaseUrl, supabaseKey);

// =========================================================
// 1. VARIABLES GLOBALES Y ESTADO DE LA INTERFAZ
// ... (Todo el resto de tu código se queda exactamente igual)

// =========================================================
// 1. VARIABLES GLOBALES Y ESTADO DE LA INTERFAZ
// =========================================================
let expeditions = [];
let selectedExpedition = null;
let filterDrawerOpen = false;
let mapScale = 1;
let mapX = 0, mapY = 0;
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let scrapedImages = [];

const modalContents = {
  antropologos: {
    title: "Antropólogos",
    body: () => {
      const uniqueAntrops = [];
      const map = new Map();
      expeditions.forEach(exp => {
        if(!map.has(exp.anthropologist)){
          map.set(exp.anthropologist, true);
          uniqueAntrops.push({
            name: exp.anthropologist,
            bio: exp.anthropologistBio,
            url: exp.anthropologistUrl,
            img: exp.anthropologistImg // Pasamos la imagen a la tarjeta
          });
        }
      });

      if (uniqueAntrops.length === 0) return `<div style="color:var(--beaver);font-size:0.8rem;">Esperando datos...</div>`;

      return `<div style="display:flex;flex-direction:column;gap:12px">` +
        uniqueAntrops.map(ant => {
          const exps = expeditions.filter(e => e.anthropologist === ant.name);
          const uniqueStates = [...new Set(exps.map(e => e.state))];

          // 1. DIBUJAMOS LA FOTO O UN EMOJI POR DEFECTO
          const fotoHtml = ant.img 
            ? `<div style="width: 48px; height: 48px; border-radius: 50%; background-image: url('${ant.img}'); background-size: cover; background-position: center; flex-shrink: 0; border: 2px solid var(--border);"></div>`
            : `<div style="width: 48px; height: 48px; border-radius: 50%; background: var(--quincy); display: flex; align-items: center; justify-content: center; font-size: 1.4rem; flex-shrink: 0;">👤</div>`;

          // 2. DIBUJAMOS EL ACORDEÓN DE LA BIOGRAFÍA
          const bioHtml = ant.bio ? `
            <details style="margin-top: 14px; font-size: 0.8rem; color: var(--dark-vanilla);">
              <summary style="cursor: pointer; color: var(--beaver); user-select: none; font-weight: 500;">Leer biografía...</summary>
              <div style="padding-top: 8px; line-height: 1.5; text-align: justify; opacity: 0.9;">
                ${ant.bio}
                ${ant.url ? `<br><a href="${ant.url}" target="_blank" style="color: #7C2220; text-decoration: underline; margin-top: 6px; display: inline-block;">Ver perfil del autor ↗</a>` : ''}
              </div>
            </details>
          ` : '';

          // 3. ARMAMOS LA TARJETA COMPLETA
          return `
            <div style="background:var(--card-bg);border:1px solid var(--border);border-radius:8px;padding:14px 16px;">
              <div style="display:flex; justify-content: space-between; align-items: center; gap: 10px;">
                
                <div style="display:flex; align-items: center; gap: 12px;">
                  ${fotoHtml}
                  <div>
                    <div style="font-family:'Playfair Display',serif;font-size:1.1rem;color:var(--dark-vanilla);margin-bottom:4px">${ant.name}</div>
                    <div style="font-size:0.75rem;color:var(--beaver)">${uniqueStates.join(' · ')} &nbsp;|&nbsp; ${exps.length} expediciones</div>
                  </div>
                </div>
                
                <button onclick="highlightAnthropologist('${ant.name}');closeModal()" 
                        style="background: #7C2220; color: #F5EDE3; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.75rem; transition: opacity 0.2s; white-space: nowrap;"
                        onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                  Ver mapa
                </button>
              </div>
              ${bioHtml}
            </div>`;
        }).join('') + `</div>`;
    }
  },

  estados: {
    title: "Por Estado",
    body: () => {
      if (expeditions.length === 0) return `<div style="color:var(--beaver);font-size:0.8rem;">Esperando datos...</div>`;
      return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">` +
        expeditions.map(e => `
          <div style="background:var(--card-bg);border:1px solid var(--border);border-radius:8px;padding:12px;cursor:pointer"
            onclick="selectExpedition(${e.id});closeModal()">
            <div style="font-size:1.4rem;margin-bottom:6px">${e.emoji || '📍'}</div>
            <div style="font-size:0.8rem;font-weight:500;color:var(--dark-vanilla)">${e.state}</div>
            <div style="font-size:0.68rem;color:var(--beaver);margin-top:2px">${e.anthropologist}</div>
          </div>`).join('') + `</div>`;
    }
  },
  imagenes: {
    title: "Galería de Imágenes",
    body: () => {
      let allFiles = [];

      // 1. Fotos de la Base de Datos (Expediciones)
      expeditions.forEach(exp => {
        if (exp.collection && exp.collection.length > 0) {
          exp.collection.forEach(item => {
            allFiles.push({ url: item, expId: exp.id, title: exp.title, isScraped: false });
          });
        }
      });

      // 2. Fotos del Web Scraping (Las que trajimos del bucket)
      allFiles = allFiles.concat(scrapedImages);

      // 3. Dibujar la cuadrícula
      if (allFiles.length === 0) {
         return `<div style="color:var(--beaver);font-size:0.8rem;">Cargando fotografías históricas...</div>`;
      }

      return `
        <div style="margin-bottom:16px;font-size:0.8rem;color:var(--beaver);line-height:1.6">
          Esta galería reúne el archivo histórico del museo WERELD MUSEUM.
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
          ${allFiles.map(file => {
            
            // Si es scraping -> Abre la foto en nueva pestaña. Si es BD -> Abre la expedición.
            const clickAction = file.isScraped 
              ? `onclick="window.open('${file.url}', '_blank')"` 
              : `onclick="selectExpedition(${file.expId});closeModal()"`;
              
            const tooltipText = file.isScraped 
              ? `Archivo recuperado: ${file.title}` 
              : `Ver expedición: ${file.title}`;

            if (file.url.startsWith('http')) {
              return `
                <div title="${tooltipText}" ${clickAction} 
                     style="aspect-ratio:1; background-image:url('${file.url}'); background-size:cover; background-position:center; border:1px solid var(--border); border-radius:6px; cursor:pointer; transition:opacity 0.2s" 
                     onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'">
                </div>`;
            } else {
              return `
                <div title="${tooltipText}" ${clickAction} 
                     style="aspect-ratio:1; background:linear-gradient(135deg,var(--quincy),var(--philippine-brown)); border:1px solid var(--border); border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:1.8rem; cursor:pointer; transition:opacity 0.2s" 
                     onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'">
                  ${file.url}
                </div>`;
            }
          }).join('')}
        </div>`;
    }
  },
  articulos: {
    title: "Artículos y Documentos",
    body: () => `
      <div style="display:flex;flex-direction:column;gap:10px">
        ${[
          {title:"México Antiguo (1890–1920)", author:"Varios autores", type:"Artículo"},
          {title:"La población del Valle de Teotihuacán", author:"Manuel Gamio, 1922", type:"Monografía"},
          {title:"Unknown Mexico", author:"Carl Lumholtz, 1902", type:"Libro"}
        ].map(a => `
          <div style="background:var(--card-bg);border:1px solid var(--border);border-radius:8px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-size:0.85rem;color:var(--dark-vanilla);font-weight:500">${a.title}</div>
              <div style="font-size:0.7rem;color:var(--beaver);margin-top:3px">${a.author}</div>
            </div>
            <span style="font-size:0.6rem;background:var(--quincy);color:var(--dark-vanilla);padding:3px 8px;border-radius:10px">${a.type}</span>
          </div>`).join('')}
      </div>`
  },
  acerca: {
    title: "Acerca del Proyecto",
    body: () => `
      <div style="font-family:'Playfair Display',serif;font-size:1.1rem;color:var(--dark-vanilla);margin-bottom:12px;line-height:1.4">
        Un mapa para recuperar la memoria etnográfica de México
      </div>
      <div style="font-size:0.82rem;color:#004D40;line-height:1.75;margin-bottom:20px">
        Un mapa para visibilizar el trabajo antropológico y etnográfico realizado por extranjeros en México.

Este atlas digitaliza y geolocaliza expediciones antropológicas en México. En este sitio encontrarás la bibliografía de los investigadores, sus hazañas principales, así como las fotografías que capturaron en sus travesías. El rango de años que se documenta son entre los años de 1880 y 1970. El propósito de este sitio, además de preservar el comienzo de la antropología en nuestro país, es invitar al espectador a formar un criterio sobre los estudios y metodologías de investigación llevadas a cabo por extranjeros en nuestro país. 
En ayuda de las colecciones de Wereld Museum, que nos proporcionaron las fotografías hechas durante la labor etnográfica de cada antropólogo; además de Wikipedia y Wikidata, que nos brindaron la información.
      </div>`
  }
};


// =========================================================
// 2. LÓGICA DE LA INTERFAZ (BOTONES, MAPA Y MENÚS)
// =========================================================

function updateHeaderStats() {
  // 1. Contar el total de expediciones
  const totalExpeditions = expeditions.length;
  
  // 2. Contar los estados ÚNICOS usando un Set
  const uniqueStates = new Set(expeditions.map(e => e.stateId)).size;
  
  // 3. Contar los antropólogos ÚNICOS usando un Set
  const uniqueAnthropologists = new Set(expeditions.map(e => e.anthropologist)).size;

  // Inyectar los números en el HTML
  const elExp = document.getElementById('stat-expeditions');
  const elStates = document.getElementById('stat-states');
  const elAntrop = document.getElementById('stat-anthropologists');

  if (elExp) elExp.textContent = totalExpeditions;
  if (elStates) elStates.textContent = uniqueStates;
  if (elAntrop) elAntrop.textContent = uniqueAnthropologists;
}
function renderMapMarkers() {
  const markersLayer = document.getElementById('markers-layer');
  if (!markersLayer) return;
  
  markersLayer.innerHTML = '';

  // 1. Agrupar expediciones por Estado
  const stateGroups = {};
  expeditions.forEach(exp => {
    if (!stateGroups[exp.stateId]) stateGroups[exp.stateId] = [];
    stateGroups[exp.stateId].push(exp);
  });

  // 2. Dibujar un solo marcador por grupo (Estado)
  Object.keys(stateGroups).forEach((stateId, index) => {
    const expsInState = stateGroups[stateId];
    
    const labelCircle = document.querySelector(`#label_points circle[id="${stateId}"]`);
    if (!labelCircle) return;

    const cx = labelCircle.getAttribute('cx');
    const cy = labelCircle.getAttribute('cy');
    const delay = (index * 0.4) % 2; 

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'expedition-marker');
    // Guardamos el stateId en lugar del id de la expedición
    g.setAttribute('data-state', stateId); 
    g.setAttribute('transform', `translate(${cx}, ${cy})`);
    
    // Le asignamos la nueva función de clic
    g.addEventListener('click', () => handleMarkerClick(stateId));

    // Si hay más de 1, dibujamos un pequeño numerito indicador al lado del punto
    const badgeHTML = expsInState.length > 1 
      ? `<text x="10" y="-10" fill="var(--dark-vanilla)" font-size="12" font-weight="bold" filter="drop-shadow(1px 1px 2px rgba(0,0,0,0.8))">${expsInState.length}</text>` 
      : '';

    g.innerHTML = `
      <g class="marker-hover-group">
        <circle class="marker-dot" r="7" cx="0" cy="0" style="animation-delay:${delay}s"/>
        <circle r="14" cx="0" cy="0" fill="none" stroke="#7C2220" stroke-width="1" opacity="0.4"/>
        ${badgeHTML}
      </g>
    `;

    markersLayer.appendChild(g);
  });
}

function handleMarkerClick(stateId) {
  // Filtramos todas las expediciones de este estado
  const expsInState = expeditions.filter(e => e.stateId === stateId);
  
  if (expsInState.length === 1) {
    // Si solo hay una, abrimos el panel lateral directo
    selectExpedition(expsInState[0].id);
  } else {
    // Si hay varias, reciclamos tu modal para mostrar la lista
    document.getElementById('modalTitle').textContent = `Expediciones en ${expsInState[0].state}`;
    
    const listHTML = `<div style="display:flex;flex-direction:column;gap:10px">` +
      expsInState.map(e => `
        <div style="background:var(--card-bg);border:1px solid var(--border);border-radius:8px;padding:14px 16px;cursor:pointer;transition:background 0.2s"
          onmouseover="this.style.background='rgba(124,34,32,0.2)'"
          onmouseout="this.style.background='var(--card-bg)'"
          onclick="closeModal(); selectExpedition(${e.id})">
          <div style="font-family:'Playfair Display',serif;font-size:1.1rem;color:var(--dark-vanilla);margin-bottom:4px">${e.title}</div>
          <div style="font-size:0.75rem;color:var(--beaver)">${e.anthropologist} · ${e.year}</div>
        </div>
      `).join('') + `</div>`;
      
    document.getElementById('modalBody').innerHTML = listHTML;
    document.getElementById('modalOverlay').classList.add('open');
  }
}


function zoomMap(factor) {
  mapScale = Math.min(Math.max(mapScale * factor, 0.7), 4);
  applyTransform();
}

function resetZoom() {
  mapScale = 1; mapX = 0; mapY = 0;
  applyTransform();
}

function applyTransform() {
  const svg = document.querySelector('#mexico-map svg');
  if (!svg) return;
  svg.style.transform = `translate(${mapX}px, ${mapY}px) scale(${mapScale})`;
  svg.style.transformOrigin = 'center center';
}

function dismissBanner() {
  const b = document.getElementById('introBanner');
  if(!b) return;
  b.style.opacity = '0';
  b.style.transform = 'translateX(-20px)';
  b.style.transition = 'all 0.4s';
  setTimeout(() => b.remove(), 400);
}

function openModal(key) {
  const content = modalContents[key];
  if(!content) return;
  document.getElementById('modalTitle').textContent = content.title;
  document.getElementById('modalBody').innerHTML = content.body();
  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

function closeModalOnBg(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
}

function setNav(id) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('nav-' + id)?.classList.add('active');
}

function toggleFilterDrawer() {
  filterDrawerOpen = !filterDrawerOpen;
  document.getElementById('filterDrawer').classList.toggle('open', filterDrawerOpen);
  document.getElementById('nav-buscar').classList.toggle('active', filterDrawerOpen);
}

function toggleChip(el) {
  el.classList.toggle('active');
  filterList(); //
}
function filterList() {
  // 1. Obtenemos lo que se escribió en el buscador
  const q = document.getElementById('searchInput').value.toLowerCase();

  // 2. Leemos los botones que están activos (usando la clase exacta de tu HTML)
  const activeChips = Array.from(document.querySelectorAll('.filter-chip.active'))
                           .map(chip => chip.textContent.trim());

  // 3. Extraemos los rangos matemáticos (atrapando guiones normales y largos)
  const activePeriods = activeChips.map(text => {
     const parts = text.split(/[-–—]/); 
     if(parts.length === 2 && !isNaN(parts[0])) {
       return { start: parseInt(parts[0]), end: parseInt(parts[1]) };
     }
     return null;
  }).filter(p => p !== null);

  // 4. Revisamos cada expedición en la lista
  document.querySelectorAll('.expedition-list-item').forEach(item => {
    const text = item.textContent.toLowerCase();
    const matchesSearch = text.includes(q);
    let matchesPeriod = true;

    // Si hay algún filtro de periodo activado, hacemos la matemática
    if (activePeriods.length > 0) {
      const expId = parseInt(item.id.replace('eli-', ''));
      const exp = expeditions.find(e => e.id === expId);

      if (exp && exp.year) {
         // Extraemos los años del texto (Si dice "1930-1934", saca [1930, 1934])
         const expYears = exp.year.match(/\d{4}/g);
         
         if (expYears) {
            const startYear = parseInt(expYears[0]);
            // Si solo tiene un año, el inicio y el fin son el mismo
            const endYear = expYears.length > 1 ? parseInt(expYears[1]) : startYear;

            // Comprobamos si el año choca con AL MENOS UNO de los periodos seleccionados
            matchesPeriod = activePeriods.some(period => {
               return (startYear <= period.end && endYear >= period.start);
            });
         } else {
            matchesPeriod = false; // Si pusieron "Desconocido", se oculta
         }
      } else {
         matchesPeriod = false;
      }
    }

    // Solo mostramos el elemento si pasa la prueba del texto Y la prueba de la fecha
    item.style.display = (matchesSearch && matchesPeriod) ? '' : 'none';
  });
}


function closePanel() {
  document.getElementById('infoPanel').classList.remove('open');
  document.querySelectorAll('.state-path').forEach(p => p.classList.remove('active', 'dimmed'));
  document.querySelectorAll('.expedition-marker').forEach(m => m.classList.remove('selected'));
  document.querySelectorAll('.expedition-list-item').forEach(el => el.classList.remove('active'));
  selectedExpedition = null;
}


function highlightAnthropologist(name) {
  // 1. Cerramos el panel de información individual si estaba abierto
  closePanel();

  // 2. Extraemos los IDs de los estados donde trabajó este autor
  const exps = expeditions.filter(e => e.anthropologist === name);
  const stateIds = exps.map(e => e.stateId);

  // 3. Iluminamos los estados correspondientes y oscurecemos el resto
  document.querySelectorAll('.state-path').forEach(p => {
    p.classList.remove('active', 'dimmed');
    if (stateIds.includes(p.id)) {
      p.classList.add('active');
    } else {
      p.classList.add('dimmed');
    }
  });

  // 4. También "encendemos" los marcadores (puntitos) de esos estados
  document.querySelectorAll('.expedition-marker').forEach(m => {
    m.classList.remove('selected');
    if (stateIds.includes(m.getAttribute('data-state'))) {
      m.classList.add('selected');
    }
  });
}
function selectExpedition(id) {
  const exp = expeditions.find(e => e.id === id);
  if(!exp) return;
  selectedExpedition = id;

  document.querySelectorAll('.expedition-marker').forEach(m => m.classList.remove('selected'));
  const marker = document.querySelector(`.expedition-marker[data-state="${exp.stateId}"]`); 
  if(marker) marker.classList.add('selected');

  document.querySelectorAll('.state-path').forEach(p => {
    p.classList.remove('active', 'dimmed');
    if (p.id === exp.stateId) p.classList.add('active');
    else p.classList.add('dimmed');
  });

  document.querySelectorAll('.expedition-list-item').forEach(el => el.classList.remove('active'));
  const eli = document.getElementById(`eli-${id}`);
  if (eli) eli.classList.add('active');

  // Textos básicos
  document.getElementById('panelTag').textContent = exp.tag;
  document.getElementById('panelTitle').textContent = exp.title;
  document.getElementById('panelAnthropologist').textContent = exp.anthropologist;
  document.getElementById('panelYear').textContent = exp.year;
  document.getElementById('panelState').textContent = exp.state;
  document.getElementById('panelDuration').textContent = exp.duration;
  document.getElementById('panelGroup').textContent = exp.group;
  document.getElementById('panelDesc').textContent = exp.desc;

  // Lógica de OPINIÓN
  const opinionSec = document.getElementById('panelOpinionSection');
  if (exp.opinion && exp.opinion.trim() !== "") {
    document.getElementById('panelOpinion').textContent = exp.opinion;
    opinionSec.style.display = 'block'; 
  } else {
    opinionSec.style.display = 'none';  
  }

  // Lógica de CÓMIC
  const comicSec = document.getElementById('panelComicSection');
  const comicImg = document.getElementById('panelComicImg');
  if (exp.comic && exp.comic.trim() !== "") {
    comicImg.src = exp.comic;
    comicSec.style.display = 'block'; 
  } else {
    comicSec.style.display = 'none';
    comicImg.src = ""; // Limpiamos la imagen anterior por si acaso
  }

  document.getElementById('panelPlaceholder').innerHTML = `
    <div style="text-align:center">
      <div style="font-size:4rem;margin-bottom:8px">${exp.emoji || '📍'}</div>
      <div style="font-size:0.65rem;color:var(--beaver);letter-spacing:.1em;text-transform:uppercase">${exp.state} · ${exp.year}</div>
    </div>`;

  document.getElementById('panelCollection').innerHTML = `
    <div class="collection-title">Archivos de la expedición</div>
    <div class="collection-grid">
      ${exp.collection.map(item => {
        if (item.startsWith('http')) {
          return `<div class="collection-thumb" title="Ver archivo" 
                       style="background-image: url('${item}'); background-size: cover; background-position: center; border: none;">
                  </div>`;
        } else {
          return `<div class="collection-thumb" title="Ver objeto">${item}</div>`;
        }
      }).join('')}
    </div>`;
    
  document.getElementById('infoPanel').classList.add('open');
}
function setupMapDrag() {
  const container = document.getElementById('mapContainer');
  if(!container) return;
  
  container.addEventListener('mousedown', e => {
    if (e.target.closest('.expedition-marker, .intro-banner, .zoom-controls, .map-legend')) return;
    isDragging = true;
    dragStart = { x: e.clientX - mapX, y: e.clientY - mapY };
    container.style.cursor = 'grabbing';
  });
  
  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    mapX = e.clientX - dragStart.x;
    mapY = e.clientY - dragStart.y;
    applyTransform();
  });
  
  window.addEventListener('mouseup', () => {
    isDragging = false;
    document.getElementById('mapContainer').style.cursor = 'grab';
  });
  
  container.addEventListener('wheel', e => {
    e.preventDefault();
    zoomMap(e.deltaY < 0 ? 1.1 : 0.91);
  }, { passive: false });
}

const tooltip = document.getElementById('mapTooltip');

function showTooltip(e, name, sub) {
  if(!tooltip) return;
  document.getElementById('tooltipName').textContent = name;
  document.getElementById('tooltipSub').textContent = sub;
  tooltip.classList.add('visible');
  moveTooltip(e);
}
function moveTooltip(e) {
  if(!tooltip) return;
  const container = document.getElementById('mapContainer').getBoundingClientRect();
  
  // Magia aquí: Multiplicamos la distancia por el mapScale.
  // Si el mapa está muy acercado, la caja se alejará más del mouse 
  // para nunca encimarse con el círculo rojo gigante.
  const offset = 15 + (10 * mapScale); 
  
  let x = e.clientX - container.left + offset;
  let y = e.clientY - container.top - 20;
  
  // Si la caja choca con el borde derecho de la pantalla, la volteamos al lado izquierdo
  if (x + 220 > container.width) {
    x = e.clientX - container.left - 220 - offset;
  }
  
  tooltip.style.left = x + 'px';
  tooltip.style.top = y + 'px';
}

function hideTooltip() { 
  if(tooltip) tooltip.classList.remove('visible'); 
}

function setupStateHovers() {
  document.querySelectorAll('.state-path').forEach(path => {
    path.addEventListener('mouseenter', (e) => {
      const name = path.getAttribute('data-name') || path.id;
      const exps = expeditions.filter(ex => ex.stateId === path.id);
      showTooltip(e, name, exps.length > 0 ? `${exps.length} expedición${exps.length>1?'es':''}` : 'Sin expediciones registradas.');
    });
    path.addEventListener('mousemove', moveTooltip);
    path.addEventListener('mouseleave', hideTooltip);
  });
}
function setupMarkerTooltips() {
  document.querySelectorAll('.expedition-marker').forEach(marker => {
    const stateId = marker.getAttribute('data-state');
    const exps = expeditions.filter(e => e.stateId === stateId);
    
    if (exps.length === 0) return;
    
    marker.addEventListener('mouseenter', (e) => {
      if (exps.length === 1) {
        showTooltip(e, exps[0].title, `${exps[0].anthropologist} · ${exps[0].year}`);
      } else {
        showTooltip(e, `${exps.length} expediciones`, `Múltiples registros en ${exps[0].state}`);
      }
    });
    marker.addEventListener('mousemove', moveTooltip);
    marker.addEventListener('mouseleave', hideTooltip);
  });
}
function buildExpeditionList() {
  const container = document.getElementById('expeditionList');
  if(!container) return;
  
  if (expeditions.length === 0) {
      container.innerHTML = `<div style="color:var(--beaver);font-size:0.8rem;padding:10px;">Esperando datos de la base...</div>`;
      return;
  }
  
  container.innerHTML = expeditions.map(e => `
    <div class="expedition-list-item" id="eli-${e.id}" onclick="selectExpedition(${e.id})">
      <div class="eli-dot"></div>
      <div>
        <div class="eli-name">${e.title}</div>
        <div class="eli-state">${e.state} · ${e.year}</div>
      </div>
    </div>`).join('');
}


// =========================================================
// 3. CONEXIÓN A BASE DE DATOS (SUPABASE)
// =========================================================


async function fetchScrapedImages() {
  try {
    // Pedimos la lista de archivos en tu nuevo bucket (ajusta el nombre si le pusiste otro)
    const { data, error } = await supabase.storage.from('scraping_historico').list('', {
      limit: 500 // Ajusta este número si subieron más de 500 fotos
    });

    if (error) throw error;

    // Filtramos para evitar archivos ocultos basura y generamos los URLs
    const validFiles = data.filter(file => file.name !== '.emptyFolderPlaceholder');

    scrapedImages = validFiles.map(file => {
      // Pedimos la URL pública de cada archivo
      const { data: urlData } = supabase.storage.from('scraping_historico').getPublicUrl(file.name);
      
      // Limpiamos el nombre del archivo para usarlo como título (quitamos guiones y la extensión .jpg)
      const cleanTitle = file.name.replace(/[-_]/g, ' ').split('.')[0];

      return {
        url: urlData.publicUrl,
        expId: null,
        title: cleanTitle,
        isScraped: true
      };
    });

  } catch (error) {
    console.error("Error cargando fotos del scraping:", error);
  }
}

async function fetchDatabaseData() {
  try {
    // Ya no necesitamos validar window.supabase, porque lo importamos arriba
  const { data, error } = await supabase
      .from('expediciones')
      .select(`
        id_expedicion,
        titulo,
        anio,
        duracion,
        grupo_etnico,
        descripcion,
        opinion,          
        url_comic,        
        id_estado,
        antropologos ( nombre, biografia, URL_Autor, URL_imagen ), 
        estados ( nombre ),
        objetos_coleccion ( icono )
      `);

    if (error) throw error;
    // ... el resto sigue igual
    // Poblar el arreglo global con los datos que llegaron
    expeditions = data.map(exp => ({
      id: exp.id_expedicion,
      title: exp.titulo,
      anthropologist: exp.antropologos?.nombre || 'Desconocido',
      anthropologistBio: exp.antropologos?.biografia || '', 
      anthropologistUrl: exp.antropologos?.URL_Autor || '', 
      anthropologistImg: exp.antropologos?.URL_imagen || '', // <--- AQUÍ CAPTURAMOS LA FOTO
      tag: "Etnografía",
      year: exp.anio,
      state: exp.estados?.nombre || 'Desconocido',
      duration: exp.duracion,
      group: exp.grupo_etnico,
      stateId: exp.id_estado,
      desc: exp.descripcion,
      opinion: exp.opinion || '',      // ¡Asegúrate de tener esto!
      comic: exp.url_comic || '',      // ¡Asegúrate de tener esto!
      emoji: "",
      collection: exp.objetos_coleccion ? exp.objetos_coleccion.map(obj => obj.icono) : []
    }));

    // Ahora sí, inyectamos la información en el panel de búsqueda y en el mapa
    renderMapMarkers();     // 1. Dibuja los puntos exactos de la BD
    buildExpeditionList();  // 2. Llena la lista del buscador
    setupMarkerTooltips();  // 3. Le pone los nombres flotantes a los nuevos puntos
    fetchScrapedImages();
    updateHeaderStats();    // 4.  ACTUALIZAMOS LOS NÚMEROS DEL HEADER
  } catch (error) {
    console.error("Error al conectar con la base de datos:", error);
    buildExpeditionList(); // Mostrará "Esperando datos..." o lista vacía
  }
}

// =========================================================
// 4. INICIALIZACIÓN (Se ejecuta al abrir la página)
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
  setupMapDrag();
  setupStateHovers();
  fetchDatabaseData();

  // Suscribirse a los cambios en tiempo real
  supabase
    .channel('mapa-en-vivo')
    .on('postgres', { event: 'INSERT', schema: 'public', table: 'expediciones' }, payload => {
      console.log('¡Nueva expedición detectada en tiempo real!', payload);
      
      // Volvemos a pedir los datos a la base de datos para dibujar el nuevo punto
      fetchDatabaseData(); 
    })
    .subscribe((status) => {
      console.log("Estado de la conexión Realtime:", status);
      });
});


// =========================================================
// 5. EXPORTAR FUNCIONES AL SCOPE GLOBAL (Para los onclick del HTML)
// =========================================================
window.zoomMap = zoomMap;
window.resetZoom = resetZoom;
window.dismissBanner = dismissBanner;
window.openModal = openModal;
window.closeModal = closeModal;
window.closeModalOnBg = closeModalOnBg;
window.setNav = setNav;
window.toggleFilterDrawer = toggleFilterDrawer;
window.toggleChip = toggleChip;
window.filterList = filterList;
window.closePanel = closePanel;
window.selectExpedition = selectExpedition;
window.highlightAnthropologist = highlightAnthropologist;

