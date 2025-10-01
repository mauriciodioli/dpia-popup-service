(function () {
// ---------- utils ----------
const $ = (sel, root=document) => Array.prototype.slice.call(root.querySelectorAll(sel));
const attr = (el,n) => el && el.getAttribute ? el.getAttribute(n) : null;

// localizar SIEMPRE el <script> actual (vale para /embed.js o lo que sea)
const SCRIPT = document.currentScript || (function () {
  const ss = document.getElementsByTagName('script');
  return ss[ss.length - 1] || null;
})();

// origen (https://dpia.site)
const origin = (SCRIPT && SCRIPT.src) ? new URL(SCRIPT.src).origin : location.origin;

// ⚠️ IMPORTANTE: priorizar data-api y NUNCA usar globals de dev
let apiBase = (attr(SCRIPT,'data-api') || '/api/popup/');
if (apiBase.startsWith('/')) apiBase = origin + apiBase;  // absolutizar
const apiList = apiBase.includes('?') ? (apiBase + '&list=1') : (apiBase + '?list=1');

// defaults visuales
const DEFAULTS = {
  placeholderOn: ((attr(SCRIPT,'data-placeholder') || 'on').toLowerCase() !== 'off'),
  placeholderColor: attr(SCRIPT,'data-placeholder-color') || '#ffd54f'
};

// (opcional) para auditar rápido en consola:
console.debug('[embed.js] origin=', origin, 'apiBase=', apiBase);


  function showPlaceholder(anchor, color, msg){
    const w = parseInt(attr(anchor,"data-width")||"400",10);
    const h = parseInt(attr(anchor,"data-height")||"600",10);
    anchor.innerHTML = `
      <div class="dpia-popup-placeholder"
           style="width:${w}px;height:${h}px;background:${color};
                  color:#111;font:600 14px/1.4 system-ui,Arial,sans-serif;
                  display:flex;align-items:center;justify-content:center;
                  border:3px dashed #111;border-radius:12px;text-align:center;">
        ${msg}
      </div>`;
  }

function renderOne(anchor, item){
  if (!item) return;

  // ratio a partir de los datos o default 3/5
  const ratio = (item.width && item.height) ? `${item.width} / ${item.height}` : '3 / 5';

  anchor.innerHTML = `
    <div class="dpia-popup" style="position:relative;display:block;width:100%">
      <button class="dpia-popup-close"
              style="position:absolute;top:6px;right:6px;border:none;
                     background:rgba(0,0,0,.6);color:#fff;border-radius:6px;
                     padding:4px 8px;cursor:pointer;z-index:2">✖</button>
      <a href="${item.href}" target="_blank" rel="noopener" style="display:block">
        <div style="width:100%;aspect-ratio:${ratio};">
          <img src="${item.image}" alt="${item.title || 'Ad'}"
               style="width:100%;height:100%;display:block;border-radius:12px;object-fit:cover"/>
        </div>
      </a>
    </div>`;

  const btnClose = anchor.querySelector(".dpia-popup-close");
btnClose.addEventListener("click", (e) => {
  e.preventDefault();
  const card = anchor.closest(".popup-fake-card")
             || anchor.closest(".card-publicacion-admin")
             || anchor;
  card.style.transition = "opacity .15s ease";
  card.style.opacity = "0";
  setTimeout(() => card.remove(), 150);
});

}


  function paramsFrom(anchor, globalDomain){
    return {
      dominio:   attr(anchor,"data-dominio")    || attr(anchor,"data-ambito-id")    || globalDomain || "",
      categoria: attr(anchor,"data-categoria")  || attr(anchor,"data-categoria-id") || "",
      lang:      attr(anchor,"data-lang")       || "",
      cp:        attr(anchor,"data-cp")         || ""
    };
  }

  const keyOf = p => `${p.dominio}|${p.categoria}|${p.lang}|${p.cp}`;

  // ---------- init que usa LISTA (una llamada por grupo) ----------
  function init(){
    // permitir configurar dominio global desde el script tag
    const globalDomain = attr(SCRIPT,"data-domain") || "";

    const anchors = $(".dpia-popup-anchor").filter(a => a.dataset.renderizado !== "true");
    if (!anchors.length) return;

    // placeholders inmediatos
    if (DEFAULTS.placeholderOn) {
      anchors.forEach(a => {
        const color = attr(a,"data-placeholder-color") || DEFAULTS.placeholderColor;
        showPlaceholder(a, color, "DPIA • POPUP ANCLA");
      });
    }

    // agrupar por (dominio,categoria,lang,cp)
    const groups = new Map();
    anchors.forEach(a => {
      const p = paramsFrom(a, globalDomain);
      const k = keyOf(p);
      if (!groups.has(k)) groups.set(k, { params: p, anchors: [] });
      groups.get(k).anchors.push(a);
    });

    // para cada grupo, pedir la LISTA una sola vez y repartir
    groups.forEach(group => {
      const { params, anchors } = group;

      // marcar para no re-procesar
      anchors.forEach(a => a.dataset.renderizado = "true");

      fetch(apiList, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params)
      })
      .then(r => {
        // si el endpoint de lista no existe (405/404), caemos al modo item por item
        if (!r.ok) throw new Error(`LIST HTTP ${r.status}`);
        return r.json();
      })
      .then(j => {
        const items = (j && Array.isArray(j.items)) ? j.items : [];
        if (items.length === 0) {
          // sin items -> fallback a single por anchor
          anchors.forEach(a => {
            fetch(apiBase, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(paramsFrom(a, globalDomain))
            })
            .then(r => r.json()).then(data => {
              if (data && data.found) renderOne(a, data);
            })
            .catch(()=>{ /* dejamos placeholder */ });
          });
          return;
        }

        // repartir items entre anchors (si sobran anchors, ciclar)
        anchors.forEach((a, idx) => {
          const it = items[idx] || items[idx % items.length];
          renderOne(a, it);
        });
      })
      .catch(() => {
        // Fallback total: una llamada por anchor al endpoint legacy
        anchors.forEach(a => {
          fetch(apiBase, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(paramsFrom(a, globalDomain))
          })
          .then(r => r.json()).then(data => {
            if (data && data.found) renderOne(a, data);
          })
          .catch(()=>{ /* dejamos placeholder */ });
        });
      });
    });
  }

  if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",init);}else{init();}
  window.initEmbedPopups = init; // re-scan para anchors dinámicos
})();
