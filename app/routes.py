from flask import Blueprint, request, jsonify, current_app
from app.models import db, User, Resource, AccessLog
import bcrypt
import jwt
from datetime import datetime, timedelta
from app.auth import token_required
from sqlalchemy.exc import IntegrityError

api_bp = Blueprint('api', __name__, url_prefix='/api')

@api_bp.route('/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'message': 'Nome de usuário e senha são obrigatórios.'}), 400

    user = User.query.filter_by(username=username).first()

    if not user or not user.check_password(password):
        return jsonify({'message': 'Credenciais inválidas. Verifique seu nome de usuário e senha.'}), 401

    try:
        token = jwt.encode(
            {'id': user.id, 'username': user.username, 'role': user.role, 'exp': datetime.utcnow() + timedelta(hours=1)},
            current_app.config['JWT_SECRET_KEY'],
            algorithm="HS256"
        )
        return jsonify({
            'token': token,
            'user': {'id': user.id, 'username': user.username, 'role': user.role, 'nome': user.nome}
        }), 200
    except Exception as e:
        current_app.logger.error(f"Erro ao gerar token JWT para {username}: {e}")
        return jsonify({'message': 'Erro interno ao gerar token de autenticação.'}), 500

@api_bp.route('/users', methods=['GET'])
@token_required(roles='admin_seguranca')
def get_users():
    try:
        users = User.query.all()
        output = []
        for user in users:
            output.append({
                'id': user.id,
                'username': user.username,
                'role': user.role,
                'nome': user.nome,
                'email': user.email
            })
        return jsonify(output), 200
    except Exception as e:
        current_app.logger.error(f"Erro ao buscar usuários: {e}")
        return jsonify({'message': 'Erro ao buscar usuários.'}), 500

@api_bp.route('/users', methods=['POST'])
@token_required(roles='admin_seguranca')
def create_user():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    role = data.get('role')
    nome = data.get('nome')
    email = data.get('email')

    if not all([username, password, role, nome]):
        return jsonify({'message': 'Por favor, preencha todos os campos obrigatórios: usuário, senha, papel e nome.'}), 400
    if role not in ['funcionario', 'gerente', 'admin_seguranca']:
        return jsonify({'message': 'Papel inválido. Escolha entre "funcionario", "gerente" ou "admin_seguranca".'}), 400

    try:
        if User.query.filter_by(username=username).first():
            return jsonify({'message': f'O nome de usuário "{username}" já existe. Por favor, escolha outro.'}), 409
        if email and User.query.filter_by(email=email).first():
            return jsonify({'message': f'O email "{email}" já está em uso por outro usuário.'}), 409

        new_user = User(username=username, role=role, nome=nome, email=email)
        new_user.set_password(password)

        db.session.add(new_user)
        db.session.commit()
        return jsonify({'message': 'Usuário criado com sucesso!', 'userId': new_user.id}), 201
    except IntegrityError as e:
        db.session.rollback()
        current_app.logger.error(f"Erro de integridade ao criar usuário {username}: {e}")
        return jsonify({'message': 'Erro de dados duplicados (usuário ou email já existe).'}), 409
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro inesperado ao criar usuário {username}: {e}")
        return jsonify({'message': f'Erro ao criar usuário: {str(e)}'}), 500

@api_bp.route('/users/<int:user_id>', methods=['DELETE'])
@token_required(roles='admin_seguranca')
def delete_user(user_id):
    try:
        user = db.session.get(User, user_id)
        if not user:
            return jsonify({'message': 'Usuário não encontrado.'}), 404

        if user.id == request.current_user.id:
            return jsonify({'message': 'Você não pode excluir seu próprio usuário.'}), 403

        db.session.delete(user)
        db.session.commit()
        return jsonify({'message': 'Usuário deletado com sucesso!'}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao deletar usuário {user_id}: {e}")
        return jsonify({'message': f'Erro ao deletar usuário: {str(e)}'}), 500

@api_bp.route('/resources', methods=['GET'])
@token_required(roles=['admin_seguranca', 'gerente', 'funcionario'])
def get_resources():
    try:
        resources = Resource.query.all()
        output = [resource.to_dict() for resource in resources]
        return jsonify(output), 200
    except Exception as e:
        current_app.logger.error(f"Erro ao buscar recursos: {e}")
        return jsonify({'message': 'Erro ao buscar recursos.'}), 500

@api_bp.route('/resources', methods=['POST'])
@token_required(roles=['admin_seguranca', 'gerente'])
def create_resource():
    data = request.get_json()
    try:
        name = data.get('name')
        resource_type = data.get('type')
        location = data.get('location')
        status = data.get('status')
        acquisition_date_str = data.get('acquisition_date')
        serial_number = data.get('serial_number')
        plate = data.get('plate')
        last_maintenance_date_str = data.get('last_maintenance_date')

        if not all([name, resource_type, location, status, acquisition_date_str]):
            return jsonify({'message': 'Nome, tipo, localização, status e data de aquisição são obrigatórios.'}), 400
        if resource_type not in ['equipamento', 'veiculo', 'dispositivo_seguranca']:
            return jsonify({'message': 'Tipo de recurso inválido.'}), 400
        if status not in ['disponivel', 'em_uso', 'em_manutencao', 'ativo', 'inativo']:
            return jsonify({'message': 'Status de recurso inválido.'}), 400

        try:
            acquisition_date = datetime.strptime(acquisition_date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'message': 'Formato inválido para "Data de Aquisição". Use AAAA-MM-DD.'}), 400

        last_maintenance_date = None
        if last_maintenance_date_str:
            try:
                last_maintenance_date = datetime.strptime(last_maintenance_date_str, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'message': 'Formato inválido para "Última Manutenção". Use AAAA-MM-DD.'}), 400

        new_resource = Resource(
            name=name,
            type=resource_type,
            serial_number=serial_number,
            plate=plate,
            location=location,
            status=status,
            acquisition_date=acquisition_date,
            last_maintenance_date=last_maintenance_date
        )
        db.session.add(new_resource)
        db.session.commit()
        return jsonify({'message': 'Recurso criado com sucesso!', 'resourceId': new_resource.id}), 201
    except IntegrityError as e:
        db.session.rollback()
        current_app.logger.error(f"Erro de integridade ao criar recurso: {e}")
        return jsonify({'message': 'Erro de dados duplicados (número de série ou placa já existe).'}), 409
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro inesperado ao criar recurso: {e}")
        return jsonify({'message': f'Erro ao criar recurso: {str(e)}'}), 500

@api_bp.route('/resources/<int:resource_id>', methods=['PUT'])
@token_required(roles=['admin_seguranca', 'gerente'])
def update_resource(resource_id):
    resource = db.session.get(Resource, resource_id)
    if not resource:
        return jsonify({'message': 'Recurso não encontrado.'}), 404

    data = request.get_json()
    try:
        if 'name' in data:
            resource.name = data['name']
        if 'type' in data:
            if data['type'] not in ['equipamento', 'veiculo', 'dispositivo_seguranca']:
                return jsonify({'message': 'Tipo de recurso inválido.'}), 400
            resource.type = data['type']
        if 'serial_number' in data:
            resource.serial_number = data['serial_number']
        if 'plate' in data:
            resource.plate = data['plate']
        if 'location' in data:
            resource.location = data['location']
        if 'status' in data:
            if data['status'] not in ['disponivel', 'em_uso', 'em_manutencao', 'ativo', 'inativo']:
                return jsonify({'message': 'Status de recurso inválido.'}), 400
            resource.status = data['status']

        if 'acquisition_date' in data:
            try:
                resource.acquisition_date = datetime.strptime(data['acquisition_date'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'message': 'Formato inválido para "Data de Aquisição". Use AAAA-MM-DD.'}), 400

        if 'last_maintenance_date' in data:
            if data['last_maintenance_date']:
                try:
                    resource.last_maintenance_date = datetime.strptime(data['last_maintenance_date'], '%Y-%m-%d').date()
                except ValueError:
                    return jsonify({'message': 'Formato inválido para "Última Manutenção". Use AAAA-MM-DD.'}), 400
            else:
                resource.last_maintenance_date = None 

        db.session.commit()
        return jsonify({'message': 'Recurso atualizado com sucesso!'}), 200
    except IntegrityError as e:
        db.session.rollback()
        current_app.logger.error(f"Erro de integridade ao atualizar recurso {resource_id}: {e}")
        return jsonify({'message': 'Erro de dados duplicados (número de série ou placa já existe).'}), 409
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro inesperado ao atualizar recurso {resource_id}: {e}")
        return jsonify({'message': f'Erro ao atualizar recurso: {str(e)}'}), 500

@api_bp.route('/resources/<int:resource_id>', methods=['DELETE'])
@token_required(roles='admin_seguranca')
def delete_resource(resource_id):
    try:
        resource = db.session.get(Resource, resource_id)
        if not resource:
            return jsonify({'message': 'Recurso não encontrado.'}), 404

        db.session.delete(resource)
        db.session.commit()
        return jsonify({'message': 'Recurso deletado com sucesso!'}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao deletar recurso {resource_id}: {e}")
        return jsonify({'message': f'Erro ao deletar recurso: {str(e)}'}), 500