from extensions import db
from models.popupsm.popup import Popup
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

def seleccionar_popup(dominio=None, categoria=None, lang=None, cp=None):
    q = db.session.query(Popup).filter(Popup.estado == "activo")

    if lang:
        q = q.filter((Popup.idioma == lang) | (Popup.idioma.is_(None)))
    if cp:
        q = q.filter((Popup.codigo_postal == cp) | (Popup.codigo_postal.is_(None)))

    if dominio:
        amb = db.session.query(Ambitos.id).filter(Ambitos.valor == dominio).first()
        if amb:
            q = q.filter((Popup.dominio_id == amb.id) | (Popup.dominio_id.is_(None)))

    if categoria:
        cat = db.session.query(CategoriaPublicacion.id).filter(CategoriaPublicacion.nombre == categoria).first()
        if cat:
            q = q.filter((Popup.categoria_id == cat.id) | (Popup.categoria_id.is_(None)))

    p = q.order_by(
        Popup.prioritario.desc(),
        Popup.fecha_creacion.desc()
    ).first()

    if not p:
        return None

    return {
        "id": p.id,
        "title": p.titulo or "",
        "image": p.imagen_url,
        "width": p.medida_ancho or 400,
        "height": p.medida_alto or 600,
        "href": p.micrositio_url or "#",
    }


# src/popups/services/selector.py
def seleccionar_popup_test(dominio=None, categoria=None, lang=None, cp=None):
    # TODO: reemplazar por query real cuando tengas el modelo
    return {
        "id": 1,
        "title": "Demo Popup",
        "image": "https://via.placeholder.com/400x600.png?text=DPIA+Popup",
        "width": 400,
        "height": 600,
        "href": "https://dpia.site",
    }
