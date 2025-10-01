from flask import Blueprint, render_template, request, current_app, redirect, url_for, flash, jsonify
from extensions import db
from utils.db_session import get_db_session
from sqlalchemy import func
from models.usuario import Usuario
from sqlalchemy.exc import SQLAlchemyError
from models.publicaciones.publicaciones import Publicacion
from models.publicaciones.estado_publi_usu import Estado_publi_usu
from models.publicaciones.publicacion_imagen_video import Public_imagen_video
from models.usuarioRegion import UsuarioRegion
from models.usuarioUbicacion import UsuarioUbicacion
from models.usuarioPublicacionUbicacion import UsuarioPublicacionUbicacion
from models.publicaciones.ambitoCategoria import AmbitoCategoria
from models.publicaciones.categoriaPublicacion import CategoriaPublicacion
from models.publicaciones.publicacionCodigoPostal import PublicacionCodigoPostal
from models.publicaciones.ambitos import Ambitos
from models.publicaciones.ambito_usuario import Ambito_usuario
from models.publicaciones.ambitoCategoriaRelation import AmbitoCategoriaRelation
from models.categoriaCodigoPostal import CategoriaCodigoPostal
from models.publicaciones.categoria_general import CategoriaGeneral, CategoriaTraduccion, normalizar_slug
from models.image import Image
from models.video import Video
from models.popupsm.popup import Popup, popup_schema, popups_schema
from models.popupsm.popup import mapear_form_a_modelo
from models.codigoPostal import CodigoPostal
from controllers.conexionesSheet.datosSheet import  actualizar_estado_en_sheet
from models.publicaciones.ambito_general import get_or_create_ambito

import controllers.conexionesSheet.datosSheet as datoSheet
import controllers.publicaciones as publicaciones
import os
import random
import re
from datetime import datetime
from werkzeug.utils import secure_filename

popup = Blueprint('popup', __name__)

SHEET_ID_DETECTOR_TENDENCIA = os.environ.get('SHEET_ID_DETECTOR_TENDENCIA')






# ---------- Endpoint: crear popup ----------
@popup.post("/admin/popup/")
def crear_popup():
    raw = request.get_json(silent=True) or request.form.to_dict(flat=True) or {}
    mapped = mapear_form_a_modelo(raw)

    with get_db_session() as session:
        # usuario activo por email
        user_id, err = resolve_active_user_id_from_email(raw, session)
        if err:
            code, msg = err
            return jsonify({"ok": False, "error": msg}), code
        mapped["user_id"] = user_id

        faltantes = [k for k in ("titulo", "imagen_url", "link") if not mapped.get(k)]
        if faltantes:
            return jsonify({"ok": False, "error": f"Faltan: {', '.join(faltantes)}"}), 400

        # --- resolver FKs por texto ---
        try:
            current_app.logger.info(
                "Resolver FKs con: ambito=%s, categoria=%s, idioma=%s",
                mapped.get("ambito"), mapped.get("categoria"), mapped.get("idioma")
            )

            if not mapped.get("dominio_id") and mapped.get("ambito"):
                ambito_obj = publicaciones.machear_ambito(mapped["ambito"], mapped.get("idioma"))
                current_app.logger.info("machear_ambito -> %s", getattr(ambito_obj, "id", None))
                if ambito_obj:
                    mapped["dominio_id"] = int(ambito_obj.id)

            if not mapped.get("categoria_id") and mapped.get("categoria") and mapped.get("dominio_id"):
                cat_id = publicaciones.machear_ambitoCategoria(
                    mapped["categoria"], mapped.get("idioma"), mapped["dominio_id"]
                )
                current_app.logger.info("machear_ambitoCategoria -> %s", cat_id)
                if cat_id:
                    # si usás este side-effect, asegurate de que usa la misma session
                    # CodigoPostal_id = publicaciones.machear_categoria_codigoPostal(cat_id, mapped["codigo_postal"])
                    mapped["categoria_id"] = int(cat_id)
        except Exception as e:
            current_app.logger.exception("Error resolviendo FKs: %s", e)

        # columnas reales
        cols = {c.name for c in Popup.__table__.columns}
        payload_db = {k: v for k, v in mapped.items() if k in cols}

        try:
            p = Popup(**payload_db)
            session.add(p)
            # commit lo hace get_db_session()
            return jsonify({"ok": True, "popup": popup_schema.dump(p)}), 201
        except (ValueError, SQLAlchemyError) as e:
            current_app.logger.exception("Error creando popup")
            # rollback lo hace get_db_session()
            return jsonify({"ok": False, "error": str(e)}), 500

def resolve_active_user_id_from_email(data: dict, session):
    email = (data.get("email") or data.get("correo_electronico") or "").strip().lower()
    if not email:
        return None, (400, "Falta correo_electronico")

    user = (
        session.query(Usuario)
        .filter(
            func.lower(Usuario.correo_electronico) == email,
            Usuario.roll == 'ADMINISTRADOR',   # o Usuario.rol si tu modelo es así
        )
        .first()
    )

    if not user:
        return None, (404, "Usuario no encontrado o sin permisos")
    if not getattr(user, "activo", 0):
        return None, (403, "Usuario inactivo")

    return int(user.id), None




















# --- LISTAR por email (valida usuario activo) ---
@popup.get("/admin/popup/list/")
def list_popups_by_email():
    email = (request.args.get("email") or "").strip().lower()
    if not email:
        return jsonify({"ok": False, "error": "Falta email"}), 400

    with get_db_session() as session:
        user_id, err = resolve_active_user_id_from_email({"email": email}, session)
        if err:
            code, msg = err
            return jsonify({"ok": False, "error": msg}), code

        items = (
            session.query(Popup)
            .filter(Popup.user_id == user_id)
            .order_by(Popup.fecha_creacion.desc())
            .all()
        )
        return jsonify({"ok": True, "items": popups_schema.dump(items)}), 200


# --- OBTENER detalle ---
@popup.get("/admin/popup/<int:popup_id>/")
def get_popup(popup_id):
    with get_db_session() as session:
        p = session.get(Popup, popup_id)
        if not p:
            return jsonify({"ok": False, "error": "No existe"}), 404
        return jsonify({"ok": True, "popup": popup_schema.dump(p)}), 200


# --- ACTUALIZAR (PUT parcial) ---
@popup.put("/admin/popup/<int:popup_id>/")
def update_popup(popup_id):
    data = request.get_json(silent=True) or {}
    fields = {
        "titulo", "imagen_url", "micrositio_url", "link", "idioma", "codigo_postal",
        "dominio_id", "categoria_id", "publicacion_id", "prioritario", "estado",
        "medida_ancho", "medida_alto"
    }

    with get_db_session() as session:
        p = session.get(Popup, popup_id)
        if not p:
            return jsonify({"ok": False, "error": "No existe"}), 404
        try:
            for k, v in data.items():
                if k in fields:
                    setattr(p, k, v)
            # commit en el context manager
            return jsonify({"ok": True, "popup": popup_schema.dump(p)}), 200
        except SQLAlchemyError as e:
            return jsonify({"ok": False, "error": str(e)}), 500


# ---------- ELIMINAR ----------
@popup.delete("/admin/popup/<int:popup_id>/")
def delete_popup(popup_id):
    with get_db_session() as session:
        p = session.get(Popup, popup_id)
        if not p:
            return jsonify({"ok": False, "error": "No existe"}), 404
        try:
            session.delete(p)
            # commit en el context manager
            return jsonify({"ok": True}), 200
        except SQLAlchemyError as e:
            return jsonify({"ok": False, "error": str(e)}), 500
