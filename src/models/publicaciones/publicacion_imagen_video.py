from flask_marshmallow import Marshmallow
from flask import Blueprint
from utils.db import db
from sqlalchemy import inspect, Enum
from sqlalchemy.orm import relationship


ma = Marshmallow()

publicacion_imagen_video = Blueprint('publicacion_imagen_video', __name__)

class Public_imagen_video(db.Model):
    __tablename__ = 'publicacion_imagen_video'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    publicacion_id = db.Column(db.Integer,nullable=False)
    imagen_id = db.Column(db.Integer,nullable=False)
    video_id = db.Column(db.Integer,nullable=False)
    fecha_creacion = db.Column(db.DateTime)
    media_type = db.Column(Enum('imagen', 'video', name='media_types'), nullable=False)
    size = db.Column(db.Float)
    
    # Relaciones
    #publicacion = relationship("Publicacion", back_populates="publicacion_imagen_video")
    #imagen = relationship("Imagen", back_populates="publicaciones_imagen")
    #video = relationship("Video", back_populates="publicaciones_video")

  

    def __init__(self, publicacion_id, imagen_id=None, video_id=None, fecha_creacion=None, media_type=None,size=None):
        self.publicacion_id = publicacion_id
        self.imagen_id = imagen_id
        self.video_id = video_id        
        self.fecha_creacion = fecha_creacion if fecha_creacion else db.func.current_timestamp()
        self.media_type = media_type
        self.size = size
    def __repr__(self):
        return f"Public_imagen_video(id={self.id}, publicacion_id={self.publicacion_id}, imagen_id={self.imagen_id}, video_id={self.video_id}, fecha_creacion={self.fecha_creacion},media_type={self.media_type},size={self.size})"

    @classmethod
    def crear_tabla_Public_imagen_video(cls):
        """
        This class method is used to create a table in the database if it does not already exist.
        It uses the SQLAlchemy 'inspect' function to check if the table exists.
        If the table does not exist, it creates the table by calling the 'create' method of the '__table__' attribute of the 'cls' class.
        The '__table__' attribute is a SQLAlchemy construct that represents the database table associated with the 'cls' class.
        The 'create' method is called on the '__table__' attribute passing the 'db.engine' object as an argument.
        The 'db.engine' object is a SQLAlchemy engine object that is used to interact with the database.
        """
        # Get the inspector object for the database engine
        insp = inspect(db.engine)
        # Check if the table already exists
        if not insp.has_table("publicacion_imagen_video"):
            # If the table does not exist, create it
            cls.__table__.create(db.engine)
            
class MerShema(ma.Schema):
    class Meta:
        fields = ("id", "publicacion_id", "imagen_id", "video_id", "fecha_creacion","media_type","size")

mer_schema = MerShema()
mer_shema = MerShema(many=True)
