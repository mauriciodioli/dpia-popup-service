// static/js/popup_form/popup_form_modifica.js
(function () {
  // ======================
  //  Navegación de pestañas
  // ======================
  $("nav button").on("click", function () {
    $("nav button").removeClass("active");
    $(this).addClass("active");
    const tab = $(this).data("tab");
    $("section.tab").removeClass("active");
    $("#" + tab).addClass("active");
  });

  // ======================
  //  Helpers UI
  // ======================
  function renderRows(list) {
    const $tb = $("#tablaPopups tbody");
    $tb.empty();

    if (!list || !list.length) {
      $("#emptyMsg").show();
      return;
    }
    $("#emptyMsg").hide();

    const rowsHtml = list
      .map(
        (p) => `
      <tr data-id="${p.id}">
        <td>${p.id}</td>
        <td>${p.titulo || ""}</td>
        <td>${p.idioma || ""}</td>
        <td>${p.codigo_postal || ""}</td>
        <td>${p.dominio_id ?? ""}</td>
        <td>${p.categoria_id ?? ""}</td>
        <td>${p.estado || ""}</td>
        <td>
          ${p.imagen_url ? `<img src="${p.imagen_url}" alt="img" class="mini-img" style="width:40px; height:auto; border-radius:4px;">` : ''}
        </td>
        <td>
          <button class="btn ghost btnSnippet" data-id="${p.id}">📎 Snippet</button>
          <button class="btn ghost btn-editar"  data-id="${p.id}">✏️ Editar</button>
          <button class="btn ghost btn-eliminar" data-id="${p.id}">🗑️ Eliminar</button>
        </td>
      </tr>`
      )
      .join("");

    $tb.html(rowsHtml);
  }

  function openModal(popup) {
    $("#editId").text(`#${popup.id}`);
    const f = document.getElementById("editForm");
    if (!f) return;

    // set values
    f.titulo.value = popup.titulo || "";
    f.link.value = popup.link || "";
    f.imagen_url.value = popup.imagen_url || "";
    f.idioma.value = popup.idioma || "";
    f.codigo_postal.value = popup.codigo_postal || "";
    f.prioritario.value = popup.prioritario ?? 0;
    f.medida_ancho.value = popup.medida_ancho ?? 400;
    f.medida_alto.value = popup.medida_alto ?? 200;
    f.estado.value = popup.estado || "activo";
    f.dominio_id.value = popup.dominio_id ?? "";
    f.categoria_id.value = popup.categoria_id ?? "";

    $("#editModal").css("display", "flex").data("id", popup.id);
  }
  function closeModal() {
    $("#editModal").hide().data("id", null);
  }

  // ======================
  //  Buscar por correo
  // ======================
  $("#btnBuscar").on("click", function () {
    const email = ($("#emailSearch").val() || "").trim();
    if (!email) {
      alert("Ingresá un correo válido.");
      return;
    }
    $.getJSON("/admin/popup/list", { email }, function (resp) {
      if (!resp.ok) {
        alert("❌ " + (resp.error || "Error"));
        return;
      }
      renderRows(resp.items || []);
    }).fail((xhr) => {
      alert("❌ HTTP " + xhr.status);
    });
  });

  // ======================
  //  Crear nueva (salta a pestaña de creación)
  // ======================
  $("#btnCrearNueva").on("click", () => {
    $('nav button[data-tab="tab-publicidad"]').click();
  });

  // ======================
  //  Modal editar
  // ======================
  $("#btnCerrarModal").on("click", closeModal);
  $("#btnGuardarModal").on("click", function () {
    const id = $("#editModal").data("id");
    if (!id) return;

    const f = document.getElementById("editForm");
    const payload = Object.fromEntries(new FormData(f).entries());

    // normalizar tipos
    payload.prioritario = parseInt(payload.prioritario || 0, 10);
    payload.medida_ancho = parseInt(payload.medida_ancho || 0, 10);
    payload.medida_alto = parseInt(payload.medida_alto || 0, 10);
    payload.dominio_id = payload.dominio_id ? parseInt(payload.dominio_id, 10) : null;
    payload.categoria_id = payload.categoria_id ? parseInt(payload.categoria_id, 10) : null;

    $.ajax({
      url: `/admin/popup/${id}`,
      method: "PUT",
      contentType: "application/json",
      data: JSON.stringify(payload),
      success: (r) => {
        if (r.ok) {
          closeModal();
          // refrescar lista
          $("#btnBuscar").click();
          Swal.fire("✅ Guardado", "Cambios aplicados", "success");
        } else {
          Swal.fire("Error", r.error || "No se pudo guardar", "error");
        }
      },
      error: (xhr) => {
        Swal.fire("Error", `HTTP ${xhr.status}`, "error");
      },
    });
  });

  // ======================
  //  Delegación de eventos en la tabla
  // ======================

  // SNIPPET
  $("#tablaPopups").on("click", ".btnSnippet", async function () {
    const id = $(this).data("id");
    try {
      const r = await fetch(`/admin/popup/${id}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      if (!j.ok || !j.popup) throw new Error(j.error || "Error");
      mp_showSnippetsFor(j.popup); // muestra el panel y rellena código
    } catch (e) {
      alert("No se pudo cargar el registro.\n" + e.message);
    }
  });

  // EDITAR
  $("#tablaPopups").on("click", ".btn-editar", async function () {
    const id = $(this).data("id");
    try {
      const r = await fetch(`/admin/popup/${id}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      if (j.ok && j.popup) openModal(j.popup);
      else throw new Error(j.error || "Error");
    } catch (e) {
      alert("No se pudo cargar el registro.\n" + e.message);
    }
  });

  // ELIMINAR
  $("#tablaPopups").on("click", ".btn-eliminar", function () {
    const id = $(this).data("id");
    Swal.fire({
      title: "¿Eliminar?",
      text: `Se eliminará el popup #${id}.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    }).then((res) => {
      if (!res.isConfirmed) return;
      $.ajax({
        url: `/admin/popup/${id}`,
        method: "DELETE",
        success: (r) => {
          if (r.ok) {
            $(`#tablaPopups tbody tr[data-id="${id}"]`).remove();
            if (!$("#tablaPopups tbody tr").length) $("#emptyMsg").show();
            Swal.fire("Eliminado", "Registro eliminado", "success");
          } else {
            Swal.fire("Error", r.error || "No se pudo eliminar", "error");
          }
        },
        error: (xhr) => Swal.fire("Error", `HTTP ${xhr.status}`, "error"),
      });
    });
  });
})();

// =====================================================
// Helpers de SNIPPET (comparten host y dos modos de DIV)
// =====================================================
function mp_buildHost() {
  const sel = document.getElementById("snippetHost");
  const chosen = sel ? sel.value : "auto";
  if (chosen && chosen !== "auto") return chosen;

  // AUTO: origen del script si existe, o el del documento
  const scriptTag = document.querySelector('script[src*="embed.js"]');
  if (scriptTag) {
    try {
      return new URL(scriptTag.src).origin;
    } catch (e) {}
  }
  return location.origin;
}

function mp_buildScriptSnippet(host, test = false) {
  const apiUrl = `${host}/api/popup${test ? "?test=1" : ""}`;
  const embedSrc = `${host}/static/js/embed.js`;
  return [
    `<script`,
    `  src="${embedSrc}"`,
    `  data-api="${apiUrl}"`,
    `  defer>`,
    `</script>`,
  ].join("\n");
}

/**
 * p = registro de la fila (lo que devolvió el backend)
 * mode: "text" | "id"
 * - text -> data-dominio, data-categoria, data-lang, data-cp (tu ejemplo actual)
 * - id   -> data-ambito-id, data-categoria-id, data-cp-id (si no tienes cp_id, cae a data-cp)
 */
function mp_buildDivSnippet(p, mode) {
  const width = p.medida_ancho || 800;
  const height = p.medida_alto || 200;

  if (mode === "id") {
    const cpAttr = p.codigo_postal_id
      ? `data-cp-id="${p.codigo_postal_id}"`
      : p.codigo_postal
      ? `data-cp="${p.codigo_postal}"`
      : ``;

    return [
      `<div class="dpia-popup-anchor"`,
      `  data-ambito-id="${p.dominio_id || ""}"`,
      `  data-categoria-id="${p.categoria_id || ""}"`,
      cpAttr ? `  ${cpAttr}` : ``,
      `  data-width="${width}"`,
      `  data-height="${height}"`,
      `  data-placeholder-color="#7CFC00"></div>`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  // modo "text" (ejemplo: dominio/categoría por nombre)
  const dominio = p.dominio_nombre || p.dominio || "Technologia";
  const categoria = p.categoria_nombre || p.categoria || "wearables";
  const lang = p.idioma || "es";
  const cp = p.codigo_postal || "";

  return [
    `<div class="dpia-popup-anchor"`,
    `  data-dominio="${dominio}"`,
    `  data-categoria="${categoria}"`,
    `  data-lang="${lang}"`,
    cp ? `  data-cp="${cp}"` : ``,
    `  data-width="${width}"`,
    `  data-height="${height}"`,
    `  data-placeholder-color="#7CFC00"></div>`,
  ]
    .filter(Boolean)
    .join("\n");
}

// Muestra el panel con el snippet de un registro
function mp_buildHostMP() {
  const sel = document.getElementById('snippetHostMP');
  const chosen = sel ? sel.value : 'auto';
  if (chosen && chosen !== 'auto') return chosen;

  const scriptTag = document.querySelector('script[src*="embed.js"]');
  if (scriptTag) { try { return new URL(scriptTag.src).origin; } catch(e){} }
  return location.origin;
}

function mp_showSnippetsFor(p) {
  const panel = document.getElementById('snippetPanelMP');
  if (!panel) return;
  panel.style.display = 'block';

  const modeSel = document.getElementById('snippetModeMP');
  const hostSel = document.getElementById('snippetHostMP');

  function render() {
    const host = mp_buildHostMP();
    const mode = modeSel ? modeSel.value : 'text';

    const scriptCode = mp_buildScriptSnippet(host, /*test*/ false);
    const divCode = mp_buildDivSnippet(p, mode);

    const scriptEl = document.getElementById('scriptSnippetMP');
    const divEl = document.getElementById('divSnippetMP');

    if (scriptEl) { scriptEl.textContent = scriptCode; scriptEl.innerText = scriptCode; }
    if (divEl)     { divEl.textContent   = divCode;   divEl.innerText   = divCode; }
  }

  render();
  hostSel && hostSel.addEventListener('change', render);
  modeSel && modeSel.addEventListener('change', render);

  document.getElementById('copyScriptMP')?.addEventListener('click', async ()=>{
    const code = document.getElementById('scriptSnippetMP').textContent || '';
    await navigator.clipboard.writeText(code);
    alert('Copiado el <script> ✅');
  });
  document.getElementById('copyDivMP')?.addEventListener('click', async ()=>{
    const code = document.getElementById('divSnippetMP').textContent || '';
    await navigator.clipboard.writeText(code);
    alert('Copiado el <div> ✅');
  });
}



// ==========================
//  Modal para imagen ampliada
// ==========================
$(document).on("click", ".mini-img", function () {
  const src = $(this).attr("src");
  $("#modalImgContenido").attr("src", src);
  $("#modalImagen").fadeIn(150);
});

$("#modalImagen").on("click", function () {
  $(this).fadeOut(150);
});
