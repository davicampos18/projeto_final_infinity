from flask_sqlalchemy import SQLAlchemy
from flask import Flask
from app.config import Config
import bcrypt

db = SQLAlchemy()

def init_db(app):
    app.config.from_object(Config)
    db.init_app(app)

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum('funcionario', 'gerente', 'admin_seguranca'), nullable=False)
    nome = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), unique=True)

    def set_password(self, password):
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    def check_password(self, password):
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))

class Resource(db.Model):
    __tablename__ = 'resources'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    type = db.Column(db.Enum('equipamento', 'veiculo', 'dispositivo_seguranca'), nullable=False)
    serial_number = db.Column(db.String(255), unique=True)
    plate = db.Column(db.String(255), unique=True)
    location = db.Column(db.String(255), nullable=False)
    status = db.Column(db.Enum('disponivel', 'em_uso', 'em_manutencao', 'ativo', 'inativo'), nullable=False)
    acquisition_date = db.Column(db.Date, nullable=False)
    last_maintenance_date = db.Column(db.Date)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'type': self.type,
            'serial_number': self.serial_number,
            'plate': self.plate,
            'location': self.location,
            'status': self.status,
            'acquisition_date': self.acquisition_date.isoformat() if self.acquisition_date else None,
            'last_maintenance_date': self.last_maintenance_date.isoformat() if self.last_maintenance_date else None
        }

class AccessLog(db.Model):
    __tablename__ = 'access_logs'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    access_area = db.Column(db.String(255))
    access_time = db.Column(db.DateTime, default=db.func.current_timestamp())
    status = db.Column(db.Enum('sucesso', 'falha'))
    ip_address = db.Column(db.String(45))

    user = db.relationship('User', backref='access_logs')