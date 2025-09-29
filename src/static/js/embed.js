(function () {
  function qsa(s){return Array.prototype.slice.call(document.querySelectorAll(s));}
  function attr(el,n){return el.getAttribute(n);}
  function buildUrl(base, params){
    const q=Object.entries(params).filter(([,v])=>v&&String(v).trim()!=="")
      .map(([k,v])=>`${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
    return q ? `${base}?${q}` : base;
  }

  function showPlaceholder(anchor, color, msg){
    const w = parseInt(attr(anchor,"data-width")||"400",10);
    const h = parseInt(attr(anchor,"data-height")||"600",10);
    anchor.innerHTML = `
      <div class="dpia-popup-placeholder"
           style="
             width:${w}px;height:${h}px;
             background:${color};
             color:#111;font:600 14px/1.4 system-ui,Arial,sans-serif;
             display:flex;align-items:center;justify-content:center;
             border:3px dashed #111;border-radius:12px;
             text-align:center;letter-spacing:.2px;">
        ${msg}
      </div>`;
  }

  function render(anchor,data){
    if(!data || !data.found){ return; } // dejamos el placeholder
    anchor.innerHTML = `
      <div class="dpia-popup" style="position:relative;display:inline-block">
        <button class="dpia-popup-close"
                style="position:absolute;top:6px;right:6px;border:none;
                       background:rgba(0,0,0,.6);color:#fff;border-radius:6px;
                       padding:4px 8px;cursor:pointer">✖</button>
        <a href="${data.href}" target="_blank" rel="noopener">
          <img src="${data.image}" alt="${data.title||'Ad'}"
               style="display:block;width:${data.width||400}px;height:${data.height||600}px;border-radius:12px"/>
        </a>
      </div>`;
    anchor.querySelector(".dpia-popup-close").addEventListener("click",e=>{
      e.preventDefault(); anchor.innerHTML="";
    });
  }

  function init(){
    var s=document.currentScript||(function(){var ss=document.getElementsByTagName('script');return ss[ss.length-1];})();
    var globalDomain=attr(s,"data-domain")||"";
    var apiBase=attr(s,"data-api")||"/api/popup";
    var defaultPlaceholder = (attr(s,"data-placeholder")||"on").toLowerCase() !== "off";
    var defaultColor = attr(s,"data-placeholder-color") || "#ffd54f"; // amarillo fuerte

    qsa(".dpia-popup-anchor").forEach(function(anchor){
      // placeholder visible inmediatamente
      if(defaultPlaceholder){
        const customColor = attr(anchor,"data-placeholder-color") || defaultColor;
        showPlaceholder(anchor, customColor, "DPIA • POPUP ANCLA");
      }

      var params={ dominio: attr(anchor,"data-dominio")||globalDomain,
                   categoria: attr(anchor,"data-categoria")||"",
                   lang: attr(anchor,"data-lang")||"",
                   cp: attr(anchor,"data-cp")||"" };
      debugger;
     fetch(apiBase, {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify(params)
            })
            .then(r => r.json())
            .then(j => render(anchor, j))
            .catch(() => { /* si falla, dejamos el placeholder */ });

    });
  }
  if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",init);}else{init();}
})();
