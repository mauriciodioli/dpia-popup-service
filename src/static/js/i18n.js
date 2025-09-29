// static/js/i18n.js
(function () {
   const I18N = {
    es:{ title:"Nuevo Popup", subtitle:"Crea, previsualiza y guarda una publicidad.",
      context:"Contexto de segmentación", domain:"Dominio", category:"Categoría", lang:"Idioma", zip:"Código Postal",
      creative:"Creatividad", titleLabel:"Título", href:"URL destino", image:"Imagen (URL)", imageHint:"Usa HTTPS o habilita img-src data: en tu CSP.",
      width:"Ancho (px)", height:"Alto (px)", priority:"Prioridad", active:"Activo", yes:"Sí", no:"No",
      autoPreview:"Previsualizar automáticamente", previewPane:"Preview", placeholder:"Completa el formulario y previsualiza aquí.",
      preview:"Previsualizar", save:"Guardar",
      errorsTitle:"Revisá estos campos:",
      snippetTitle: "Snippet de inserción",
      snippetHelp: "Pegá esto en la página donde quieras que aparezca el popup.",
      hostLabel: "Host",
      hostAuto: "Origen del script (AUTO)",
      hostLocal: "http://127.0.0.1:8100",
      hostIP: "http://54.234.169.22:8100",
      hostProd: "https://api.dpia.site",
      copyScript: "Copiar",
      copyDiv: "Copiar",
      scriptTag: "«script»",
      email:"Correo electrónico",
      divTag: "«div class=\"dpia-popup-anchor\"»"
    },
    en:{ title:"New Popup", subtitle:"Create, preview and save an ad.",
      context:"Targeting context", domain:"Domain", category:"Category", lang:"Language", zip:"Postal Code",
      creative:"Creative", titleLabel:"Title", href:"Destination URL", image:"Image (URL)", imageHint:"Use HTTPS or allow img-src data: in your CSP.",
      width:"Width (px)", height:"Height (px)", priority:"Priority", active:"Active", yes:"Yes", no:"No",
      autoPreview:"Auto preview", previewPane:"Preview", placeholder:"Fill the form to preview here.",
      preview:"Preview", save:"Save",
      errorsTitle:"Please fix these fields:",
      snippetTitle: "Embed snippet",
      snippetHelp: "Paste this where you want the popup to appear.",
      hostLabel: "Host",
      hostAuto: "Script origin (AUTO)",
      hostLocal: "http://127.0.0.1:8100",
      hostIP: "http://54.234.169.22:8100",
      hostProd: "https://api.dpia.site",
      copyScript: "Copy",
      copyDiv: "Copy",
      scriptTag: "«script»",
      email:"Email",
      divTag: "«div class=\"dpia-popup-anchor\"»"
    },
    pl:{ title:"Nowy Popup", subtitle:"Utwórz, podejrzyj i zapisz reklamę.",
      context:"Kontekst targetowania", domain:"Domena", category:"Kategoria", lang:"Język", zip:"Kod pocztowy",
      creative:"Kreacja", titleLabel:"Tytuł", href:"Adres docelowy", image:"Obraz (URL)", imageHint:"Użyj HTTPS lub zezwól na img-src data: w CSP.",
      width:"Szerokość (px)", height:"Wysokość (px)", priority:"Priorytet", active:"Aktywny", yes:"Tak", no:"Nie",
      autoPreview:"Podgląd automatyczny", previewPane:"Podgląd", placeholder:"Wypełnij formularz, aby zobaczyć podgląd.",
      preview:"Podgląd", save:"Zapisz",
      errorsTitle:"Popraw te pola:",
       snippetTitle: "Fragment do wklejenia",
      snippetHelp: "Wklej to na stronie, gdzie ma pojawić się popup.",
      hostLabel: "Host",
      hostAuto: "Pochodzenie skryptu (AUTO)",
      hostLocal: "http://127.0.0.1:8100",
      hostIP: "http://54.234.169.22:8100",
      hostProd: "https://api.dpia.site",
      copyScript: "Kopiuj",
      copyDiv: "Kopiuj",
      scriptTag: "«script»",
      email:"E-mail", 
      divTag: "«div class=\"dpia-popup-anchor\"»"
    }
  
  };

  // estado compartido
  window.DPIA = window.DPIA || {};
  window.DPIA.state = window.DPIA.state || { lang: "es" };

  window.DPIA.$t = (k) => {
    const lang = window.DPIA.state.lang || "es";
    const dict = I18N[lang] || I18N.es;
    return (dict && dict[k]) || (I18N.es && I18N.es[k]) || k;
  };

  window.DPIA.applyI18n = function applyI18n() {
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      el.textContent = window.DPIA.$t(key);
    });
  };
})();
