(function () {
// ---------- utils ----------
function toItems(j){
  if (Array.isArray(j)) return j;                 // array directo
  if (j && Array.isArray(j.items)) return j.items; // {items:[...]}
  if (j && j.found) return [j];                   // objeto único {found: true, ...}
  if (j && Array.isArray(j.data)) return j.data;  // {data:[...]} por si acaso
  if (j && Array.isArray(j.results)) return j.results; // {results:[...]}
  return [];
}

const deDupById = (arr) => {
  const seen = new Set();
  return arr.filter(x => {
    const k = (x && (x.id ?? x.popup_id ?? x.slug ?? JSON.stringify(x))) + '';
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

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
  // antes: placeholderOn true
  // placeholderOn: ((attr(SCRIPT,'data-placeholder') || 'on').toLowerCase() !== 'off'),
  // ahora: off por defecto; se enciende con data-placeholder="on"
  placeholderOn: (attr(SCRIPT,'data-placeholder') || 'off').toLowerCase() === 'on',
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

  // 1) lee tamaño pedido por el anchor
  const w = parseInt(attr(anchor, "data-width")  || "400", 10);
  const h = parseInt(attr(anchor, "data-height") || "600", 10);

  // 2) decide qué ratio usar
  const useItemRatio = (attr(anchor, "data-use-item-ratio") || "false").toLowerCase() === "true";
  const ratio = (useItemRatio && item.width && item.height)
    ? `${item.width} / ${item.height}`
    : `${w} / ${h}`;

  // 3) opcional: cómo encajar la imagen (default cover)
  const fit = (attr(anchor, "data-fit") || "cover").toLowerCase(); // "cover" | "contain"

  anchor.innerHTML = `
    <div class="dpia-popup" style="position:relative;display:block;width:100%">
      <button class="dpia-popup-close"
              style="position:absolute;top:6px;right:6px;border:none;
                     background:rgba(0,0,0,.6);color:#fff;border-radius:6px;
                     padding:4px 8px;cursor:pointer;z-index:2">✖</button>
      <a href="${item.href}" target="_blank" rel="noopener" style="display:block">
        <div style="width:100%;aspect-ratio:${ratio};">
          <img src="${item.image}" alt="${item.title || 'Ad'}"
               style="width:100%;height:100%;display:block;border-radius:12px;object-fit:${fit}"/>
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





function renderMany(anchor, items){
  anchor.innerHTML = `
    <div class="dpia-popups-wrap" style="display:grid;gap:12px;"></div>`;
  const wrap = anchor.querySelector('.dpia-popups-wrap');

  // opcional: columnas vía atributo data-cols
  const cols = parseInt(attr(anchor,'data-cols')||'0',10);
  if (cols > 0) wrap.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

  items.forEach(it => {
    const holder = document.createElement('div');
    renderOne(holder, it);
    wrap.appendChild(holder.firstElementChild); // inyecta la tarjeta
  });
}



  function paramsFrom(anchor, globalDomain){
  return {
    dominio:   attr(anchor,"data-dominio")    || attr(anchor,"data-ambito-id")    || globalDomain || "",
    categoria: attr(anchor,"data-categoria")  || attr(anchor,"data-categoria-id") || "",
    lang:      attr(anchor,"data-lang")       || attr(SCRIPT,"data-lang")         || document.documentElement.lang || "",
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
          const items = toItems(j);


        
          if (items.length === 0) {
             // repartir items entre anchors (si sobran anchors, ciclar) con default inteligente
                anchors.forEach((a, idx) => {
                  // default: si hay un solo anchor y NO tiene data-count, mostramos todos los items
                  let countAttr = attr(a,'data-count');
                  let count = parseInt(countAttr || '1', 10);
                  if (anchors.length === 1 && !countAttr) count = items.length;
                  count = Math.max(1, count);

                  const allowDup = (attr(a,'data-allow-duplicates')||'false').toLowerCase() === 'true';

                  if (count === 1) {
                    const it = items[idx] || items[idx % Math.max(items.length,1)];
                    if (it) renderOne(a, it);
                  } else {
                    // arma el pool respetando allowDup
                    let pool = items.slice(0);
                    if (!allowDup) {
                      // opcional: de-dup si tus items pueden venir repetidos
                      pool = deDupById(pool);
                    }
                    // si pedís más de los que hay y allowDup=false, capea
                    // si allowDup=true, completa ciclando
                    const picked = allowDup
                      ? Array.from({length: count}, (_, i) => pool[i % Math.max(pool.length,1)]).filter(Boolean)
                      : pool.slice(0, Math.min(count, pool.length));

                    if (picked.length) renderMany(a, picked);
                  }
                });

              return;
            }

        
        // repartir items entre anchors SIN repetir por defecto
              const allowDupGroup = anchors.some(a =>
                (attr(a,'data-allow-duplicates')||'false').toLowerCase()==='true'
              );

              // pool (dedup si no se permiten duplicados)
              let pool = allowDupGroup ? items.slice(0) : deDupById(items);

              // calcular pedido por anchor (default: si hay 1 anchor y no tiene count -> todos)
              const countsRequested = anchors.map(a => {
                const countAttr = attr(a,'data-count');
                let c = parseInt(countAttr || '1', 10);
                if (anchors.length === 1 && !countAttr) c = pool.length;
                return Math.max(1, c);
              });

              // si NO hay duplicados, no asignes más de lo disponible
              let counts = countsRequested.slice(0);
              if (!allowDupGroup) {
                let remaining = pool.length;
                counts = counts.map(c => {
                  const take = Math.min(c, remaining);
                  remaining -= take;
                  return take; // puede quedar 0 para los últimos
                });
              }

              let cursor = 0;

              anchors.forEach((a, idx) => {
                const take = counts[idx];

                // ⬇️ SI NO HAY NADA PARA ESTE ANCHOR, ELIMINAR LA TARJETA COMPLETA
                if (take <= 0) {
                  const card =
                    a.closest(".popup-fake-card, .card-publicacion-admin, .card-publicacion, .card") || a;
                  card.remove(); // (alternativa: card.style.display = "none";)
                  return;
                }

                let picked = [];
                if (allowDupGroup) {
                  const n = Math.max(pool.length, 1);
                  for (let i = 0; i < take; i++) picked.push(pool[(cursor + i) % n]);
                  cursor = (cursor + take) % Math.max(pool.length, 1);
                } else {
                  picked = pool.slice(cursor, cursor + take);
                  cursor += take;
                }

                if (picked.length === 1) {
                  renderOne(a, picked[0]);
                } else {
                  renderMany(a, picked);
                }
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
