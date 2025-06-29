import os
import requests
from flask import Blueprint, request, jsonify
import json
from collections import defaultdict
from controllers.conexionesSheet.datosSheet import login, autenticar_y_abrir_sheet

# 📌 Token y Task ID de Apify
APIFY_TOKEN = os.getenv("APIFY_TOKEN")

TASK_ID = "ruly_economy/dpia-amazon"

ACTOR_ID = "axesso_data~amazon-search-scraper"


# 📍 Blueprint
scrape_amazon_dpia = Blueprint('scrape_amazon_dpia', __name__)

# 📍 Endpoint que se invoca desde el botón
@scrape_amazon_dpia.route('/scrape_amazon', methods=['POST'])
def scrape_amazon():
    try:
        # Recibo sheet_name (p.ej. "Polonia") del front
        sheet_name = request.get_json().get("sheet_name")
        sheetId = '1munTyxoLc5px45cz4cO_lLRrqyFsOwjTUh8xDPOiHOg'
        sheet = autenticar_y_abrir_sheet(sheetId, sheet_name)

        resultados = []
        if not sheet:
            return jsonify(success=False, error="No pude abrir la hoja")

        # 1) Traigo todas las filas
        filas = sheet.get_all_records()  

        # 2) Filtro sólo las que necesito
        #    Ajusta las condiciones al gusto:
        filas_validas = [
            f for f in filas 
            if f.get("Producto")
            and f.get("estado", "").upper() == "ACTIVO"
            and str(f.get("validado", "")).upper() == "FALSE"
        ]

        if not filas_validas:
            return jsonify(success=True, datos=[])

        # 3) Llamo al scraper **una sola vez** con la lista entera
        resultados_globales = lanzar_scraping_amazon(filas_validas, sheet_name)
       
        print("=== DEBUG Scrape Amazon ===")
        print(f"Filas válidas: {len(filas_validas)}")
        print(f"Resultados Globales: {len(resultados_globales)} entradas")
        print(json.dumps(resultados_globales, indent=2, ensure_ascii=False))
        return jsonify(success=True, datos=resultados_globales)

    except Exception as e:
        return jsonify(success=False, error=str(e))


def lanzar_scraping_amazon(registros: list, pais_defecto: str) -> list:
    import json, pathlib
    dominio_por_pais = {
        "argentina": "com", "canada": "ca", "francia": "fr", "italia": "it",
        "estados_unidos": "com", "alemania": "de", "espana": "es", "polonia": "pl"
    }
    ACTOR_ID = "axesso_data~amazon-search-scraper"
    base_url = (
        f"https://api.apify.com/v2/acts/{ACTOR_ID}/run-sync-get-dataset-items"
        f"?token={APIFY_TOKEN}"
    )

    # 1) Payload con searchId
    payload = {
        "input": [
            {
                "searchId":   idx,
                "keyword":    fila["Producto"],
                "domainCode": dominio_por_pais.get(fila.get("País","").lower(), "com"),
                "sortBy":     "recent",
                "maxPages":   1,
                "category":   "aps"
            }
            for idx, fila in enumerate(registros)
        ]
    }

    # 2) Petición única
    resp = requests.post(base_url, json=payload, timeout=90)
    resp.raise_for_status()
    datos = resp.json()

    # 3) DEBUG: vuelca los primeros 5 registros para inspección
    print(">>> DEBUG primeros items de Apify:", json.dumps(datos[:5], indent=2, ensure_ascii=False))

    if not isinstance(datos, list) or not datos:
        raise ValueError("Respuesta vacía o inválida.")

    # 4) Agrupo PLANO por searchId
    agrupado = defaultdict(list)
    for item in datos:
        sid = item.get("searchId")
        agrupado[sid].append(item)

    # 5) Reconstruyo resultados por cada fila original
    resultados = []
    for idx, fila in enumerate(registros):
        raw_items = agrupado.get(idx, [])
        print(f">>> DEBUG fila {idx} ('{fila['Producto']}') tiene {len(raw_items)} items crudos")

        # Transformo cada registro en el formato que quiero
        items = []
        for d in raw_items:
            if d.get("productDescription"):
                items.append({
                    "titulo": d["productDescription"],
                    "precio": d.get("price", "N/A"),
                    "imagen": d.get("imgUrl", ""),
                    "url":     f"https://www.amazon.{dominio_por_pais.get(fila.get('País','').lower(), 'com')}{d.get('dpUrl','')}"
                })

        if items:
            resultados.append({
                "producto": fila["Producto"],
                "pais":     fila["País"],
                "items":    items
            })
        else:
            resultados.append({
                "producto": fila["Producto"],
                "pais":     fila["País"],
                "error":    "Sin productos relevantes o bloque faltante."
            })

    return resultados