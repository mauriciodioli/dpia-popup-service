
from models.popupsm.popup import Popup


from datetime import datetime
from flask import Blueprint,flash

create_tablas = Blueprint('create_tablas',__name__)

def crea_tablas_DB():
    Popup.crear_tabla_popup()
   
    flash('Tablas creadas exitosamente', 'success')
    print('tablas creadas exitosamente')
    
    
    
    
    
    
    
   
    