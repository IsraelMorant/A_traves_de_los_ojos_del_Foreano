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

const modalContents = {
  antropologos: {
    title: "Antropólogos",
    body: () => {
      const list = [...new Set(expeditions.map(e => e.anthropologist))];
      if (list.length === 0) return `<div style="color:var(--beaver);font-size:0.8rem;">Esperando datos...</div>`;
      return `<div style="display:flex;flex-direction:column;gap:12px">` +
        list.map(name => {
          const exps = expeditions.filter(e => e.anthropologist === name);
          return `<div style="background:var(--card-bg);border:1px solid var(--border);border-radius:8px;padding:14px 16px;cursor:pointer"
            onclick="selectExpedition(${exps[0].id});closeModal()">
            <div style="font-family:'Playfair Display',serif;font-size:1rem;color:var(--dark-vanilla);margin-bottom:4px">${name}</div>
            <div style="font-size:0.72rem;color:var(--beaver)">${exps.map(e=>e.state).join(' · ')} &nbsp;|&nbsp; ${exps[0].tag}</div>
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
    body: () => `
      <div style="margin-bottom:16px;font-size:0.8rem;color:var(--beaver);line-height:1.6">
        Esta galería reúne fotografías históricas de las expediciones documentadas.
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
        ${Array.from({length:16}).map((_,i) => `
          <div style="aspect-ratio:1;background:linear-gradient(135deg,var(--quincy),var(--philippine-brown));border:1px solid var(--border);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:1.8rem;cursor:pointer;transition:opacity 0.2s" onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'">
            ${['📷','🏺','🗿','📜','🎭','🌿','🏛️','👤','🎨','📐','🧵','🌵','🎵','🦋','🌾','🏔️'][i]}
          </div>`).join('')}
      </div>`
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
      <div style="font-size:0.82rem;color:rgba(245,237,227,0.75);line-height:1.75;margin-bottom:20px">
        Este atlas digitaliza y geolocaliza expediciones antropológicas realizadas en México entre 1880 y 1970.
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
}

function filterList() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  document.querySelectorAll('.expedition-list-item').forEach(item => {
    const text = item.textContent.toLowerCase();
    item.style.display = text.includes(q) ? '' : 'none';
  });
}

function closePanel() {
  document.getElementById('infoPanel').classList.remove('open');
  document.querySelectorAll('.state-path').forEach(p => p.classList.remove('active', 'dimmed'));
  document.querySelectorAll('.expedition-marker').forEach(m => m.classList.remove('selected'));
  document.querySelectorAll('.expedition-list-item').forEach(el => el.classList.remove('active'));
  selectedExpedition = null;
}

function selectExpedition(id) {
  const exp = expeditions.find(e => e.id === id);
  if(!exp) return;
  selectedExpedition = id;

  document.querySelectorAll('.expedition-marker').forEach(m => m.classList.remove('selected'));
 // const marker = document.querySelector(`.expedition-marker[data-id="${id}"]`);
 
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

  document.getElementById('panelTag').textContent = exp.tag;
  document.getElementById('panelTitle').textContent = exp.title;
  document.getElementById('panelAnthropologist').textContent = exp.anthropologist;
  document.getElementById('panelYear').textContent = exp.year;
  document.getElementById('panelState').textContent = exp.state;
  document.getElementById('panelDuration').textContent = exp.duration;
  document.getElementById('panelGroup').textContent = exp.group;
  document.getElementById('panelDesc').textContent = exp.desc;

  document.getElementById('panelPlaceholder').innerHTML = `
    <div style="text-align:center">
      <div style="font-size:4rem;margin-bottom:8px">${exp.emoji || '📍'}</div>
      <div style="font-size:0.65rem;color:var(--beaver);letter-spacing:.1em;text-transform:uppercase">${exp.state} · ${exp.year}</div>
    </div>`;

 document.getElementById('panelCollection').innerHTML = `
    <div class="collection-title">Archivos de la expedición</div>
    <div class="collection-grid">
      ${exp.collection.map(item => {
        // Si el texto empieza con "http", es una imagen subida
        if (item.startsWith('http')) {
          return `<div class="collection-thumb" title="Ver archivo" 
                       style="background-image: url('${item}'); background-size: cover; background-position: center; border: none;">
                  </div>`;
        } 
        // Si no, asumimos que es un emoji antiguo
        else {
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
      showTooltip(e, name, exps.length > 0 ? `${exps.length} expedición${exps.length>1?'es':''}` : 'Sin expediciones registradas');
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
        id_estado,
        antropologos ( nombre ),
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
      tag: "Etnografía",
      year: exp.anio,
      state: exp.estados?.nombre || 'Desconocido',
      duration: exp.duracion,
      group: exp.grupo_etnico,
      stateId: exp.id_estado,
      desc: exp.descripcion,
      emoji: "",
      collection: exp.objetos_coleccion ? exp.objetos_coleccion.map(obj => obj.icono) : []
    }));

    // Ahora sí, inyectamos la información en el panel de búsqueda y en el mapa
    renderMapMarkers();     // 1. Dibuja los puntos exactos de la BD
    buildExpeditionList();  // 2. Llena la lista del buscador
    setupMarkerTooltips();  // 3. Le pone los nombres flotantes a los nuevos puntos

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


