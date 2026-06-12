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
  submitBtn.textContent = "Guardando expedición y subiendo fotos...";
  submitBtn.disabled = true;

  const nuevaExpedicion = {
    titulo: document.getElementById('titulo').value,
    id_antropologo: parseInt(document.getElementById('id_antropologo').value),
    id_estado: document.getElementById('id_estado').value,
    anio: document.getElementById('anio').value,
    duracion: document.getElementById('duracion').value,
    grupo_etnico: document.getElementById('grupo_etnico').value,
    descripcion: document.getElementById('descripcion').value
  };

  try {
    // 1. Insertar expedición y pedirle a Supabase que nos devuelva el ID generado (.select())
    const { data: expData, error: expError } = await supabase
      .from('expediciones')
      .insert([nuevaExpedicion])
      .select();

    if (expError) throw expError;
    const nuevaExpedicionId = expData[0].id_expedicion;

    // 2. Subir las imágenes (si el usuario seleccionó alguna)
    const files = document.getElementById('imagenes_upload').files;
    
    for (const file of files) {
      // Crear un nombre único para que no choquen si se llaman igual
      const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      
      // Subir al bucket 'galeria'
      const { error: uploadError } = await supabase.storage
        .from('galeria')
        .upload(fileName, file);
        
      if (uploadError) throw uploadError;

      // Obtener la URL pública de la imagen
      const { data: urlData } = supabase.storage
        .from('galeria')
        .getPublicUrl(fileName);

      // 3. Guardar la URL en la tabla objetos_coleccion
      await supabase.from('objetos_coleccion').insert([
        { id_expedicion: nuevaExpedicionId, icono: urlData.publicUrl }
      ]);
    }

    alert("¡Expedición y fotografías guardadas con éxito!");
    document.getElementById('admin-form').reset();
    
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