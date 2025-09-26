from flask import Blueprint, request, jsonify
from .services.selector import seleccionar_popup, seleccionar_popup_test

popups_api_bp = Blueprint("popups_api_bp", __name__)

@popups_api_bp.get("/api/popup")
def api_popup():
    params = {
        "dominio": request.args.get("dominio"),
        "categoria": request.args.get("categoria"),
        "lang": request.args.get("lang"),
        "cp": request.args.get("cp"),
    }
    popup = seleccionar_popup_test(**params)
    if not popup:
        return jsonify({"found": False}), 200
    return jsonify({"found": True, **popup}), 200

@popups_api_bp.get("/health")
def health():
    return {"ok": True, "service": "dpia-popup-service"}, 200
