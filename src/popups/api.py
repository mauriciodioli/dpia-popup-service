from flask import Blueprint, request, jsonify
from  popups.services.selector import seleccionar_popup
from  popups.services.selector import seleccionar_popup_test

api = Blueprint("api", __name__)

@api.get("/api/popup")
def api_popup():
    # si viene test=1 usar el mock
    if request.args.get("test") in ("1", "true", "yes"):
        data = seleccionar_popup_test(
            dominio=request.args.get("dominio"),
            categoria=request.args.get("categoria"),
            lang=request.args.get("lang"),
            cp=request.args.get("cp"),
        )
        return jsonify({"found": True, **data}), 200

    # flujo real (cuando conectes DB)
    params = {
        "dominio": request.args.get("dominio"),
        "categoria": request.args.get("categoria"),
        "lang": request.args.get("lang"),
        "cp": request.args.get("cp"),
    }
    data = seleccionar_popup(**params)
    if not data:
        return jsonify({"found": False}), 200
    return jsonify({"found": True, **data}), 200
@api.get("/health")
def health():
    return {"ok": True, "service": "dpia-popup-service"}, 200
