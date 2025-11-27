# backend/app.py

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

# --- API: Отримання ВСІХ товарів (Каталог) ---
@app.route('/api/products', methods=['GET'])
def get_products():
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor(dictionary=True)
    
    # Використовуємо UNION, щоб зібрати товари з усіх таблиць в один список
    # Ми додаємо штучні поля 'type' та 'condition_text', щоб JS знав, як їх малювати
    sql = """
        SELECT id, brand, model, color, memory, 'New' as condition_text, description, image_url, price, 'NewPhone' as type 
        FROM NewPhones
        
        UNION ALL
        
        SELECT id, brand, model, color, memory, condition_text, description, image_url, price, 'UsedPhone' as type 
        FROM UsedPhones
        
        UNION ALL
        
        SELECT id, 'Аксесуар' as brand, name as model, 'N/A' as color, 'N/A' as memory, 'New' as condition_text, description, image_url, price, 'Accessory' as type 
        FROM Accessories
        
        UNION ALL
        
        SELECT id, 'Послуга' as brand, name as model, 'N/A' as color, 'N/A' as memory, 'N/A' as condition_text, description, image_url, price, 'Service' as type 
        FROM Services
    """
    
    try:
        cursor.execute(sql)
        products = cursor.fetchall()
        return jsonify(products)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# --- API: Фільтрація (Пошук) ---
# Приклад запиту: /api/search?q=iPhone
@app.route('/api/search', methods=['GET'])
def search_products():
    query = request.args.get('q', '') # Отримуємо текст пошуку
    if not query:
        return jsonify([])

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    # Шукаємо схожий текст у всіх таблицях
    search_term = f"%{query}%"
    
    sql = """
        SELECT id, brand, model, image_url, price, 'NewPhone' as type FROM NewPhones WHERE model LIKE %s
        UNION ALL
        SELECT id, brand, model, image_url, price, 'UsedPhone' as type FROM UsedPhones WHERE model LIKE %s
        UNION ALL
        SELECT id, 'Аксесуар', name, image_url, price, 'Accessory' as type FROM Accessories WHERE name LIKE %s
    """
    
    cursor.execute(sql, (search_term, search_term, search_term))
    results = cursor.fetchall()
    
    cursor.close()
    conn.close()
    return jsonify(results)

if __name__ == '__main__':
    # Запускаємо сервер на порту 5000
    app.run(debug=True, port=5000)