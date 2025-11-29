from flask import Flask, jsonify, request
from flask_cors import CORS
import mysql.connector
from db_config import db_config

app = Flask(__name__)
# Дозволяємо запити з фронтенду (Vite зазвичай на порту 5173)
CORS(app) 

# --- Підключення до БД ---
def get_db_connection():
    try:
        conn = mysql.connector.connect(**db_config)
        return conn
    except mysql.connector.Error as err:
        print(f"Помилка підключення до БД: {err}")
        return None

@app.route('/')
def home():
    return "Backend MobileShop is running!"

# ==========================================
# 1. ОТРИМАННЯ ДАНИХ (GET) ДЛЯ ВКЛАДОК
# ==========================================

# Вкладка "Телефони" (Нові + Б/У)
@app.route('/api/phones', methods=['GET'])
def get_phones():
    conn = get_db_connection()
    if not conn: return jsonify({'error': 'No DB connection'}), 500
    
    cursor = conn.cursor(dictionary=True)
    sql = """
        SELECT id, brand, model, color, memory, 'New' as condition_text, description, image_url, price, stock_quantity, 'NewPhone' as type 
        FROM NewPhones
        UNION ALL
        SELECT id, brand, model, color, memory, condition_text, description, image_url, price, stock_quantity, 'UsedPhone' as type 
        FROM UsedPhones
        ORDER BY id DESC
    """
    cursor.execute(sql)
    phones = cursor.fetchall()
    conn.close()
    return jsonify(phones)

# Вкладка "Аксесуари"
@app.route('/api/accessories', methods=['GET'])
def get_accessories():
    conn = get_db_connection()
    if not conn: return jsonify({'error': 'No DB connection'}), 500

    cursor = conn.cursor(dictionary=True)
    # name беремо як model, 'Accessory' як brand
    sql = """
        SELECT id, name as model, 'Accessory' as brand, 'N/A' as color, 'N/A' as memory, 'New' as condition_text, 
               description, image_url, price, stock_quantity, 'Accessory' as type 
        FROM Accessories 
        ORDER BY id DESC
    """
    cursor.execute(sql)
    items = cursor.fetchall()
    conn.close()
    return jsonify(items)

# Вкладка "Послуги"
@app.route('/api/services', methods=['GET'])
def get_services():
    conn = get_db_connection()
    if not conn: return jsonify({'error': 'No DB connection'}), 500

    cursor = conn.cursor(dictionary=True)
    # У послуг немає кількості (stock_quantity), тому ставимо NULL
    sql = """
        SELECT id, name as model, 'Service' as brand, 'N/A' as color, 'N/A' as memory, 'N/A' as condition_text, 
               description, image_url, price, NULL as stock_quantity, 'Service' as type 
        FROM Services 
        ORDER BY id DESC
    """
    cursor.execute(sql)
    items = cursor.fetchall()
    conn.close()
    return jsonify(items)

# Загальний список (для пошуку на клієнті, якщо потрібно)
@app.route('/api/products', methods=['GET'])
def get_all_products():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    sql = """
        SELECT id, brand, model, image_url, price, 'NewPhone' as type FROM NewPhones
        UNION ALL
        SELECT id, brand, model, image_url, price, 'UsedPhone' as type FROM UsedPhones
        UNION ALL
        SELECT id, 'Accessory', name, image_url, price, 'Accessory' as type FROM Accessories
        UNION ALL
        SELECT id, 'Service', name, image_url, price, 'Service' as type FROM Services
    """
    cursor.execute(sql)
    res = cursor.fetchall()
    conn.close()
    return jsonify(res)

# ==========================================
# 2. КЕРУВАННЯ ТОВАРАМИ (CRUD)
# ==========================================

# ДОДАВАННЯ (POST)
@app.route('/api/products', methods=['POST'])
def add_product():
    try:
        data = request.json
        conn = get_db_connection()
        cursor = conn.cursor()

        # 1. Новий телефон
        if data['type'] == 'NewPhone':
            sql = "INSERT INTO NewPhones (brand, model, color, memory, description, image_url, price, stock_quantity) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"
            val = (data['brand'], data['model'], data['color'], data['memory'], data['description'], data['image_url'], data['price'], data['stock_quantity'])
        
        # 2. Б/У телефон
        elif data['type'] == 'UsedPhone':
            sql = "INSERT INTO UsedPhones (brand, model, color, memory, condition_text, battery_health, description, image_url, price, stock_quantity) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
            val = (data['brand'], data['model'], data['color'], data['memory'], data['condition_text'], data.get('battery_health', 100), data['description'], data['image_url'], data['price'], 1)
        
        # 3. Аксесуар
        elif data['type'] == 'Accessory':
            sql = "INSERT INTO Accessories (name, type, compatible_with, description, image_url, price, stock_quantity) VALUES (%s, 'General', 'Universal', %s, %s, %s, %s)"
            val = (data['model'], data['description'], data['image_url'], data['price'], data['stock_quantity'])
            
        # 4. Послуга
        elif data['type'] == 'Service':
            sql = "INSERT INTO Services (name, description, image_url, price) VALUES (%s, %s, %s, %s)"
            val = (data['model'], data['description'], data['image_url'], data['price'])
        
        else:
            return jsonify({'error': 'Невідомий тип'}), 400

        cursor.execute(sql, val)
        conn.commit()
        conn.close()
        return jsonify({'message': 'Товар успішно додано!'}), 201
    except Exception as e:
        print("Add Error:", e)
        return jsonify({'error': str(e)}), 500

# ОНОВЛЕННЯ (PUT)
@app.route('/api/products/<int:id>', methods=['PUT'])
def update_product(id):
    try:
        data = request.json
        p_type = data.get('type')
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 1. Оновлення ПОСЛУГ
        if p_type == 'Service':
             sql = "UPDATE Services SET price=%s, description=%s, image_url=%s, name=%s WHERE id=%s"
             val = (data['price'], data['description'], data['image_url'], data['model'], id)
        
        # 2. Оновлення АКСЕСУАРІВ
        elif p_type == 'Accessory':
             sql = "UPDATE Accessories SET price=%s, stock_quantity=%s, description=%s, image_url=%s, name=%s WHERE id=%s"
             val = (data['price'], data['stock_quantity'], data['description'], data['image_url'], data['model'], id)
        
        # 3. Оновлення Б/У ТЕЛЕФОНІВ
        elif p_type == 'UsedPhone':
             sql = """
                UPDATE UsedPhones 
                SET brand=%s, model=%s, color=%s, memory=%s, 
                    price=%s, stock_quantity=%s, description=%s, image_url=%s,
                    condition_text=%s, battery_health=%s
                WHERE id=%s
             """
             val = (
                 data['brand'], data['model'], data['color'], data['memory'],
                 data['price'], data['stock_quantity'], data['description'], data['image_url'],
                 data['condition_text'], data.get('battery_health'),
                 id
             )

        # 4. Оновлення НОВИХ ТЕЛЕФОНІВ
        elif p_type == 'NewPhone':
             sql = """
                UPDATE NewPhones 
                SET brand=%s, model=%s, color=%s, memory=%s, 
                    price=%s, stock_quantity=%s, description=%s, image_url=%s
                WHERE id=%s
             """
             val = (
                 data['brand'], data['model'], data['color'], data['memory'],
                 data['price'], data['stock_quantity'], data['description'], data['image_url'],
                 id
             )
        
        else:
            return jsonify({'error': 'Невідомий тип'}), 400

        cursor.execute(sql, val)
        conn.commit()
        conn.close()
        return jsonify({'message': 'Оновлено успішно!'})
    except Exception as e:
        print("Update Error:", e)
        return jsonify({'error': str(e)}), 500

# ВИДАЛЕННЯ (DELETE)
@app.route('/api/products/<int:id>', methods=['DELETE'])
def delete_product(id):
    try:
        # Тип передається через URL параметр: /api/products/5?type=NewPhone
        p_type = request.args.get('type')
        
        table_map = {
            'NewPhone': 'NewPhones',
            'UsedPhone': 'UsedPhones',
            'Accessory': 'Accessories',
            'Service': 'Services'
        }
        table = table_map.get(p_type)
        
        if not table:
            return jsonify({'error': 'Невідомий тип для видалення'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(f"DELETE FROM {table} WHERE id = %s", (id,))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Видалено успішно!'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==========================================
# 3. АВТОРИЗАЦІЯ
# ==========================================
@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.json
        username = data.get('username')
        password = data.get('password')
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        # Увага: тут пароль текстом. Для продакшн треба хешування.
        cursor.execute("SELECT * FROM Admins WHERE username = %s AND password = %s", (username, password))
        admin = cursor.fetchone()
        conn.close()
        if admin: return jsonify({'success': True})
        else: return jsonify({'success': False, 'error': 'Невірні дані'}), 401
    except Exception as e: return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)