from flask import Flask, jsonify
from flask_cors import CORS
from app.config import Config
from app.models import db, init_db, User, Resource, AccessLog # Importe todas as models para que o db.create_all as encontre
from app.routes import api_bp
import bcrypt 

app = Flask(__name__)
app.config.from_object(Config)
CORS(app) 

init_db(app) 

# --- NOVO: Comando para criar todas as tabelas do banco de dados ---
@app.cli.command("create-db")
def create_db_command():
    with app.app_context():
        db.create_all()
        print("Banco de dados e tabelas criados/atualizados.")

@app.cli.command("create-initial-users")
def create_initial_users():
    
    with app.app_context():
        # Certifique-se de que as tabelas existam antes de adicionar usuários
        # Recomenda-se rodar 'flask create-db' antes de 'flask create-initial-users' pela primeira vez
        print("Verificando ou criando usuários iniciais...")
        users_to_create = [
            {'username': 'admin', 'password': 'admin123', 'role': 'admin_seguranca', 'nome': 'Bruce Wayne', 'email': 'bruce.wayne@waynecorp.com'},
            {'username': 'gerente', 'password': 'gerente123', 'role': 'gerente', 'nome': 'Lucius Fox', 'email': 'lucius.fox@waynecorp.com'},
            {'username': 'funcionario', 'password': 'funcionario123', 'role': 'funcionario', 'nome': 'Alfred Pennyworth', 'email': 'alfred.pennyworth@waynecorp.com'}
        ]

        for user_data in users_to_create:
            if not User.query.filter_by(username=user_data['username']).first():
                new_user = User(
                    username=user_data['username'],
                    role=user_data['role'],
                    nome=user_data['nome'],
                    email=user_data['email']
                )
                new_user.set_password(user_data['password']) 
                db.session.add(new_user)
                print(f"Usuário '{user_data['username']}' criado.")
            else:
                print(f"Usuário '{user_data['username']}' já existe. Ignorando.")

        db.session.commit()
        print("Verificação/criação de usuários iniciais concluída.")


app.register_blueprint(api_bp)

@app.route('/')
def index():
    return "API das Indústrias Wayne funcionando com Flask!"

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)