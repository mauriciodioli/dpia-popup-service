from flask import Blueprint, render_template, request, current_app, redirect, url_for, flash, jsonify
from extensions import db
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
from models.codigoPostal import CodigoPostal
from controllers.conexionesSheet.datosSheet import  actualizar_estado_en_sheet
from models.publicaciones.ambito_general import get_or_create_ambito

import controllers.conexionesSheet.datosSheet as datoSheet
import os
import random
import re
from datetime import datetime
from werkzeug.utils import secure_filename

popup = Blueprint('popup', __name__)

SHEET_ID_DETECTOR_TENDENCIA = os.environ.get('SHEET_ID_DETECTOR_TENDENCIA')

# -------- Endpoint para crear popup (POST) --------
@popup.route("/admin/popup", methods=["POST"])  # compatible con Flask < 2.0
def crear_popup():
    data = request.get_json(silent=True) or {}
    faltantes = [k for k in ["titulo", "imagen_url"] if not data.get(k)]
    if faltantes:
        return jsonify({"ok": False, "error": f"Faltan: {', '.join(faltantes)}"}), 400
    try:
        p = Popup(
            titulo          = data.get("titulo"),
            imagen_url      = data.get("imagen_url"),
            micrositio_url  = data.get("micrositio_url"),
            link            = data.get("link"),
            idioma          = data.get("idioma"),
            codigo_postal   = data.get("codigo_postal"),
            dominio_id      = data.get("dominio_id"),
            categoria_id    = data.get("categoria_id"),
            publicacion_id  = data.get("publicacion_id"),
            user_id         = data.get("user_id"),
            prioritario     = int(data.get("prioritario") or 0),
            estado          = data.get("estado") or "activo",
            medida_ancho    = int(data.get("medida_ancho") or 400),
            medida_alto     = int(data.get("medida_alto") or 600),
        )
        db.session.add(p)
        db.session.commit()
        return jsonify({"ok": True, "popup": popup_schema.dump(p)}), 201
    except (ValueError, SQLAlchemyError) as e:
        db.session.rollback()
        return jsonify({"ok": False, "error": str(e)}), 500