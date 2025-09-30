from flask import Blueprint, request, jsonify
from popups.services.selector import seleccionar_popup, seleccionar_popup_test,seleccionar_popups
import sys

api = Blueprint("api", __name__)

@api.route("/api/popup", methods=["GET", "POST"])
def api_popup():
    # logs visibles siempre
    print("💥 api_popup() ACTIVADO", file=sys.stderr)

    # 1) tomar params de query (GET) y body (POST JSON)
    q = request.args.to_dict() if request.args else {}
    b = request.get_json(silent=True) or {}
    # merge: body pisa a query si vienen ambos
    params = {
        "dominio": (b.get("dominio") or q.get("dominio") or ""),
        "categoria": (b.get("categoria") or q.get("categoria") or ""),
        "lang": (b.get("lang") or q.get("lang") or ""),
        "cp": (b.get("cp") or q.get("cp") or ""),
    }
    test_flag = (b.get("test") or q.get("test") or "").lower() in ("1", "true", "yes")

    print("METHOD:", request.method, "PARAMS:", params, "TEST:", test_flag, file=sys.stderr)

    # 2) mock vs real
    if test_flag:
        data = seleccionar_popup_test(**params)
        return jsonify({"found": True, **data}), 200

    data = seleccionar_popup(**params)
    if not data:
        return jsonify({"found": False}), 200
    return jsonify({"found": True, **data}), 200


@api.get("/health")
def health():
    return {"ok": True, "service": "dpia-popup-service"}, 200



@api.route("/api/popup/list", methods=["POST"])
def api_popup_list():
    b = request.get_json(silent=True) or {}
    items = seleccionar_popups(
        dominio=b.get("dominio"),
        categoria=b.get("categoria"),
        lang=b.get("lang"),
        cp=b.get("cp"),
        limit=b.get("limit"),  # opcional
    )
    return jsonify({"items": items, "found": bool(items)}), 200

