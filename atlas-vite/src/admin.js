import { createClient } from '@supabase/supabase-js';

// Inicializar Supabase
const supabaseUrl = 'https://vyqoxoxgvatdvjyxtnom.supabase.co';
const supabaseKey = 'sb_publishable_yT9IPHfCN4AY4OK7fpkUyQ_CujLEU4r';
const supabase = createClient(supabaseUrl, supabaseKey);

// 1. Cargar las opciones de los <select> al iniciar la página
async function loadSelectOptions() {
  try {
    // Traer Antropólogos
    const { data: antropologos } = await supabase.from('antropologos').select('*').order('nombre');
    const selectAntropologo = document.getElementById('id_antropologo');
    selectAntropologo.innerHTML = '<option value="">Selecciona un autor...</option>';
    antropologos.forEach(a => {
      selectAntropologo.innerHTML += `<option value="${a.id_antropologo}">${a.nombre}</option>`;
    });

    // Traer Estados
    const { data: estados } = await supabase.from('estados').select('*').order('nombre');
    const selectEstado = document.getElementById('id_estado');
    selectEstado.innerHTML = '<option value="">Selecciona un estado...</option>';
    estados.forEach(e => {
      selectEstado.innerHTML += `<option value="${e.id_estado}">${e.nombre}</option>`;
    });

  } catch (error) {
    console.error("Error cargando catálogos:", error);
  }
}

// 2. Manejar el envío del formulario
document.getElementById('admin-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Cambiamos el texto del botón para que el usuario sepa que está cargando
  const submitBtn = document.querySelector('.btn-submit');
  submitBtn.textContent = "Guardando expedición, cómic y fotos...";
  submitBtn.disabled = true;

  try {
    // =====================================
    // A. SUBIR EL CÓMIC AL BUCKET 'galeria'
    // =====================================
    const comicInput = document.getElementById('comic');
    let comicUrl = null;

    if (comicInput.files.length > 0) {
      const comicFile = comicInput.files[0];
      const comicName = `comic_${Date.now()}_${comicFile.name.replace(/\s+/g, '_')}`;
      
      const { error: comicUploadError } = await supabase.storage
        .from('galeria') 
        .upload(comicName, comicFile);

      if (comicUploadError) throw comicUploadError;

      const { data: comicUrlData } = supabase.storage
        .from('galeria')
        .getPublicUrl(comicName);

      comicUrl = comicUrlData.publicUrl;
    }

    // =====================================
    // B. INSERTAR LA EXPEDICIÓN CON OPINIÓN Y CÓMIC
    // =====================================
    const opinionInput = document.getElementById('opinion');

    const nuevaExpedicion = {
      titulo: document.getElementById('titulo').value,
      id_antropologo: parseInt(document.getElementById('id_antropologo').value),
      id_estado: document.getElementById('id_estado').value,
      anio: document.getElementById('anio').value,
      duracion: document.getElementById('duracion').value,
      grupo_etnico: document.getElementById('grupo_etnico').value,
      descripcion: document.getElementById('descripcion').value,
      opinion: opinionInput ? opinionInput.value : '', // Guardamos la opinión
      url_comic: comicUrl // Guardamos el link del cómic
    };

    const { data: expData, error: expError } = await supabase
      .from('expediciones')
      .insert([nuevaExpedicion])
      .select();

    if (expError) throw expError;
    const nuevaExpedicionId = expData[0].id_expedicion;

    // =====================================
    // C. SUBIR FOTOS HISTÓRICAS
    // =====================================
    const files = document.getElementById('imagenes_upload').files;
    
    for (const file of files) {
      const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      
      const { error: uploadError } = await supabase.storage
        .from('galeria')
        .upload(fileName, file);
        
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('galeria')
        .getPublicUrl(fileName);

      await supabase.from('objetos_coleccion').insert([
        { id_expedicion: nuevaExpedicionId, icono: urlData.publicUrl }
      ]);
    }

    alert("¡Expedición, cómic y fotografías guardadas con éxito!");
    document.getElementById('admin-form').reset();
    
    // Regresamos al mapa automáticamente
    window.location.href = '/index.html';
    
  } catch (error) {
    alert("Hubo un error: " + error.message);
    console.error(error);
  } finally {
    submitBtn.textContent = "Guardar en la Base de Datos";
    submitBtn.disabled = false;
  }
});

// Inicializar
document.addEventListener('DOMContentLoaded', loadSelectOptions);