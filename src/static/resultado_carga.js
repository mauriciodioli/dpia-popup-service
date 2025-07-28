// 🔍 Ejecutar scraping Apify
 document.addEventListener("DOMContentLoaded", function () {
    const selectPais = document.getElementById("pais");

    // Cargar valor guardado si existe
    const paisGuardado = localStorage.getItem("lugarSeleccionado");
    if (paisGuardado) {
      selectPais.value = paisGuardado;
    }

    // Guardar nuevo valor cuando cambia
    selectPais.addEventListener("change", function () {
      const lugar = selectPais.value;
      if (lugar) {
        localStorage.setItem("lugarSeleccionado", lugar);
      } else {
        localStorage.removeItem("lugarSeleccionado"); // Si elige vacío, lo borra
      }
    });
  });


$('#btn-cargar-sheet').click(function () {
    const selectedCountry = localStorage.getItem('lugarSeleccionado');
    const selectedFile = $('#ArchivosCargados').val();

    console.log("[DEBUG] selectedCountry:", selectedCountry);
    console.log("[DEBUG] selectedFile:", selectedFile);

    if (!selectedCountry || !selectedFile) {
        Swal.fire("Error", "Por favor, seleccioná un país y un archivo primero.", "error");
        return;
    }

    Swal.fire({
        title: 'Scrapeando...',
        text: `Procesando archivo ${selectedFile} para ${selectedCountry}`,
        didOpen: () => Swal.showLoading()
    });

    const payload = {
        sheet_name: selectedCountry,
        nombre_archivo: selectedFile
    };

    console.log("[DEBUG] Payload que se envía al backend:", payload);

    $.ajax({
        url: "/scrape_amazon_scrapeado/",
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify(payload),


          success: function (response) {
              console.log("[DEBUG] Respuesta del backend:", response);
                if (!response.success) {
                    Swal.fire("Error", response.error || "Algo salió mal", "error");
                    return;
                }
                if (response.archivo_relacionado) {
                        localStorage.setItem("archivoRelacionado", response.archivo_relacionado);
                    }
                //---------------- TABLA A  (scraping) ----------------//
                const resultados = response.tablaA;
                let htmlA = `
                    <h3>Productos encontrados (Scraping Apify):</h3>
                    <table border="1" style="width:100%;border-collapse:collapse">
                    <thead>
                        <tr><th>Producto</th><th>Imagen</th><th>Título</th><th>Precio</th><th>Enlace</th></tr>
                    </thead><tbody>`;

                resultados.forEach((res, idx) => {
                    htmlA += `
                    <tr class="group-header" data-group="${idx}" style="cursor:pointer;background:#f0f0f0">
                        <td colspan="5"><strong>${res.producto}</strong> (${res.pais}) <span class="toggle-icon">▼</span></td>
                    </tr>`;

                    if (res.error) {
                    htmlA += `<tr class="group-${idx}" style="display:none"><td colspan="5" style="color:red;text-align:center">${res.error}</td></tr>`;
                    return;
                    }
                    res.items.forEach(item => {
                    htmlA += `
                        <tr class="group-${idx}" style="display:none">
                        <td></td>
                        <td><img src="${item.imagen}" width="80"></td>
                        <td>${item.titulo}</td>
                        <td>${item.precio} €</td>
                        <td><a href="${item.url}" target="_blank">Ver producto</a></td>
                        </tr>`;
                    });
                });
                htmlA += `</tbody></table>`;

                //---------------- TABLA B  (sheet + top-3) -----------//

                    filasData = response.tablaB;
                    let htmlB = `
                    <h3 style="margin-top:40px;">Selección final (Sheet + Top-3)</h3>
                    <table border="1" style="width:100%;border-collapse:collapse;">
                    <thead><tr>`;

                    // Cabecera dinámica
                    Object.keys(filasData[0]).forEach(col => {
                    htmlB += `<th>${col}</th>`;
                    });
                    htmlB += `<th>Acción</th></tr></thead><tbody>`;   // ← “Acción” aquí, todavía en thead

                    // Filas de datos
                    filasData.forEach((f, idx) => {
                    htmlB += "<tr>";
                    Object.keys(filasData[0]).forEach(col => {
                        const val = f[col] ?? "";
                        if (col.startsWith("imagen") || col === "item_imagen") {
                        htmlB += `<td>${val ? `<img src="${val}" width="60">` : ""}</td>`;
                        } else if (col.endsWith("_url") || col.startsWith("búsqueda_")) {
                        htmlB += `<td>${val ? `<a href="${val}" target="_blank">link</a>` : ""}</td>`;
                        } else {
                        htmlB += `<td>${val}</td>`;
                        }
                    });
                    // Botón individual con índice correcto
                    htmlB += `<td><button class="btn-enviar" data-idx="${idx}">Enviar</button></td>`;
                    htmlB += "</tr>";
                    });

                    htmlB += "</tbody></table>";



                //---------------- Inyectar en el DOM ----------------//
                $('#resultado').html(htmlA + htmlB);

                // toggle filas de la tabla A
                $('.group-header').on('click', function () {
                    const g = $(this).data('group');
                    $(`.group-${g}`).toggle();
                    const ic = $(this).find('.toggle-icon');
                    ic.text(ic.text() === '▼' ? '▲' : '▼');
                });

                Swal.fire("¡Listo!", "Scraping completado con éxito.", "success");
                },
                error() { Swal.fire("Error", "No se pudo contactar al backend.", "error"); }

      });
    });










    // delegación por si recargas la tabla
// delegación sobre el contenedor #resultado
$('#resultado').on('click', '.btn-enviar', function () {

    const $btn   = $(this);           // botón clicado
    const idx    = $btn.data('idx');  // índice que guardaste en data-idx
    const fila   = filasData[idx];    // el objeto JS con la fila completa
    const pais   = $('#pais').val();  // país seleccionado en tu combo (o input)
    let archivo_relacionado = localStorage.getItem("archivoRelacionado"); // nombre del archivo relacionado
    Swal.fire({ title: 'Enviando fila…', didOpen: () => Swal.showLoading() });

    $.ajax({
        url: "/carga_publicacion_en_db/",
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify({ sheet_name: pais, fila, archivo_relacionado: archivo_relacionado }),

        success() {
            // 1) feedback
            Swal.fire("OK", "Fila cargada y validada", "success");

            // 2) ocultar o desactivar botón
            $btn.prop('disabled', true).hide();

            // 3) escribir TRUE en la columna `validado`
            //    — buscamos la celda cuyo <th> dice “validado”
            const $tr   = $btn.closest('tr');
            const colIx = $tr.closest('table')
                             .find('thead th')
                             .toArray()
                             .findIndex(th => $(th).text().trim().toLowerCase() === 'validado');
            if (colIx !== -1) {
                $tr.find('td').eq(colIx).text('TRUE');
            }
        },

        error() { Swal.fire("Error", "No se cargó la fila", "error"); }
    });
});


























lugar = localStorage.getItem('lugarSeleccionado') || 'Argentina'; // Valor por defecto

$.ajax({
  url: "/scrape_amazon_listar_trabajos/",
  method: "POST",
  data: JSON.stringify({ lugar: lugar }), // Enviar JSON real
  dataType: "json",
  contentType: "application/json",
  beforeSend: function() {
    $("#ArchivosCargados").empty().append('<option value="">Cargando archivos...</option>');
  },
  success: function(response) {
    if (response.success) {
      const archivos = response.archivos;
      const select = $("#ArchivosCargados");
      select.empty(); // Limpia las opciones anteriores

      select.append(`<option value="">Seleccione un Archivo</option>`);
      archivos.forEach(nombre => {
        select.append(`<option value="${nombre}">${nombre}</option>`);
      });
    } else {
      alert("⚠️ Error al cargar archivos: " + response.error);
    }
  },
  error: function(xhr, status, error) {
    console.error("❌ Error en la petición AJAX:", error);
  }
});









$("#ArchivosCargados").on("change", function () {
  const val = $(this).val();
  $("#btnEliminarArchivo").prop("disabled", !val);
});





$("#btnEliminarArchivo").on("click", function () {
  const archivo = $("#ArchivosCargados").val();
  if (!archivo) return;

  if (confirm(`¿Seguro que querés eliminar el archivo "${archivo}"? Esta acción no se puede deshacer.`)) {
    $.post("/scrape_amazon_eliminar_archivo/", { archivo: archivo }, function (response) {
      if (response.success) {
        alert("✅ Archivo eliminado correctamente");
        $("#ArchivosCargados").val("");
        $("#btnEliminarArchivo").prop("disabled", true);
        // Vuelve a cargar la lista
        cargarListadoArchivos();
      } else {
        alert("❌ Error al eliminar: " + response.error);
      }
    });
  }
});




function cargarListadoArchivos() {
  $.ajax({
    url: "/scrape_amazon_listar_trabajos/",
    method: "POST",
    success: function (response) {
      if (response.success) {
        const select = $("#ArchivosCargados");
        select.empty().append(`<option value="">Seleccione un Archivo</option>`);
        response.archivos.forEach(nombre => {
          select.append(`<option value="${nombre}">${nombre}</option>`);
        });
      }
    }
  });
}

// Llamar al cargar la página
$(document).ready(function () {
  cargarListadoArchivos();
});
