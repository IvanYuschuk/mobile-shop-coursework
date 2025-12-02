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

# === ЗАГАЛЬНИЙ API ДЛЯ КЛІЄНТА (ВСЕ РАЗОМ) ===
@app.route('/api/products', methods=['GET'])
def get_all_products():
    conn = get_db_connection()
    if not conn: return jsonify({'error': 'No DB'}), 500
    
    cursor = conn.cursor(dictionary=True)
    
    # ВИПРАВЛЕНО: Додані всі поля (color, memory, description...), яких не вистачало
    sql = """
        SELECT id, brand, model, color, memory, 'New' as condition_text, description, image_url, price, stock_quantity, 'NewPhone' as type 
        FROM NewPhones
        
        UNION ALL
        
        SELECT id, brand, model, color, memory, condition_text, description, image_url, price, stock_quantity, 'UsedPhone' as type 
        FROM UsedPhones
        
        UNION ALL
        
        SELECT id, 'Аксесуар' as brand, name as model, 'N/A' as color, 'N/A' as memory, 'New' as condition_text, description, image_url, price, stock_quantity, 'Accessory' as type 
        FROM Accessories
        
        UNION ALL
        
        SELECT id, 'Послуга' as brand, name as model, 'N/A' as color, 'N/A' as memory, 'N/A' as condition_text, description, image_url, price, NULL as stock_quantity, 'Service' as type 
        FROM Services
    """
    
    try:
        cursor.execute(sql)
        res = cursor.fetchall()
        return jsonify(res)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

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

# === ОФОРМЛЕННЯ ЗАМОВЛЕННЯ (ОНОВЛЕНО) ===
@app.route('/api/orders', methods=['POST'])
def create_order():
    try:
        data = request.json
        cart = data.get('cart')
        
        # Отримуємо нові поля з форми
        delivery = data.get('delivery')
        payment = data.get('payment')
        address = data.get('address')
        
        if not cart: return jsonify({'error': 'Кошик порожній'}), 400
        if not data.get('phone'): return jsonify({'error': 'Вкажіть телефон'}), 400

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # 1. ПОШУК / СТВОРЕННЯ КЛІЄНТА
        phone = data['phone']
        cursor.execute("SELECT client_id FROM Clients WHERE phone = %s", (phone,))
        existing_client = cursor.fetchone()

        if existing_client:
            client_id = existing_client['client_id']
            # Оновлюємо ім'я клієнта, якщо воно змінилося
            cursor.execute("UPDATE Clients SET full_name=%s, email=%s WHERE client_id=%s", 
                           (data['fullName'], data['email'], client_id))
        else:
            # Створюємо нового клієнта (адресу тут можна не писати, вона тепер в замовленні)
            sql_client = "INSERT INTO Clients (full_name, phone, email) VALUES (%s, %s, %s)"
            cursor.execute(sql_client, (data['fullName'], phone, data['email']))
            client_id = cursor.lastrowid

        # 2. СТВОРЕННЯ ЗАМОВЛЕННЯ (З АДРЕСОЮ І ДОСТАВКОЮ)
        total_amount = sum(float(item['price']) * int(item['quantity']) for item in cart)
        
        sql_order = """
            INSERT INTO Orders 
            (client_id, total_amount, status, delivery_method, payment_method, delivery_address) 
            VALUES (%s, %s, 'Прийнято', %s, %s, %s)
        """
        cursor.execute(sql_order, (client_id, total_amount, delivery, payment, address))
        order_id = cursor.lastrowid

        # 3. ДОДАВАННЯ ТОВАРІВ
        for item in cart:
            sql_item = """
                INSERT INTO OrderItems (order_id, product_type, product_id, quantity, price_at_purchase)
                VALUES (%s, %s, %s, %s, %s)
            """
            cursor.execute(sql_item, (order_id, item['type'], item['id'], item['quantity'], item['price']))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({'message': 'Замовлення успішно створено!', 'order_id': order_id}), 201

    except Exception as e:
        print("Order Error:", e)
        return jsonify({'error': str(e)}), 500
        

# ==========================================
# 4. ОТРИМАННЯ ЗАМОВЛЕНЬ ТА КЛІЄНТІВ (АДМІНКА)
# ==========================================

# Список ЗАМОВЛЕНЬ (з іменами клієнтів)
@app.route('/api/admin/orders', methods=['GET'])
def get_admin_orders():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    # JOIN з таблицею клієнтів, щоб бачити, хто замовив
    sql = """
        SELECT o.order_id, o.order_date, o.status, o.total_amount, o.delivery_method, o.payment_method,
               c.full_name, c.phone
        FROM Orders o
        JOIN Clients c ON o.client_id = c.client_id
        ORDER BY o.order_date DESC
    """
    cursor.execute(sql)
    orders = cursor.fetchall()
    conn.close()
    return jsonify(orders)

# Список КЛІЄНТІВ
@app.route('/api/admin/clients', methods=['GET'])
def get_admin_clients():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM Clients ORDER BY created_at DESC")
    clients = cursor.fetchall()
    conn.close()
    return jsonify(clients)

# Список ПРОДУКТІВ У ЗАМОВЛЕННЯХ (Деталі)
@app.route('/api/admin/order-items', methods=['GET'])
def get_admin_order_items():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    # Складний запит, який підтягує назву товару залежно від його типу
    sql = """
        SELECT oi.id, oi.order_id, oi.product_id, oi.quantity, oi.price_at_purchase, oi.product_type,
               CASE 
                   WHEN oi.product_type = 'NewPhone' THEN (SELECT CONCAT(brand, ' ', model) FROM NewPhones WHERE id = oi.product_id)
                   WHEN oi.product_type = 'UsedPhone' THEN (SELECT CONCAT(brand, ' ', model, ' (Б/У)') FROM UsedPhones WHERE id = oi.product_id)
                   WHEN oi.product_type = 'Accessory' THEN (SELECT name FROM Accessories WHERE id = oi.product_id)
                   WHEN oi.product_type = 'Service' THEN (SELECT name FROM Services WHERE id = oi.product_id)
                   ELSE 'Невідомий товар'
               END as product_name
        FROM OrderItems oi
        ORDER BY oi.order_id DESC
    """
    cursor.execute(sql)
    items = cursor.fetchall()
    conn.close()
    return jsonify(items)

# 5. ІСТОРІЯ ЗАМОВЛЕНЬ КЛІЄНТА (ПОШУК)
# ==========================================
@app.route('/api/client/orders', methods=['POST'])
def get_client_orders_history():
    try:
        data = request.json
        phone = data.get('phone')
        
        if not phone: return jsonify({'error': 'Введіть телефон'}), 400

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT client_id, full_name FROM Clients WHERE phone = %s", (phone,))
        client = cursor.fetchone()
        
        if not client:
            conn.close()
            return jsonify({'error': 'Клієнта не знайдено'}), 404
            
        cursor.execute("SELECT * FROM Orders WHERE client_id = %s ORDER BY order_date DESC", (client['client_id'],))
        orders = cursor.fetchall()
        
        for order in orders:
            # Для кожного замовлення беремо товари
            sql_items = """
                SELECT oi.quantity, oi.price_at_purchase, oi.product_type,
                   CASE 
                       WHEN oi.product_type = 'NewPhone' THEN (SELECT CONCAT(brand, ' ', model) FROM NewPhones WHERE id = oi.product_id)
                       WHEN oi.product_type = 'UsedPhone' THEN (SELECT CONCAT(brand, ' ', model, ' (Б/У)') FROM UsedPhones WHERE id = oi.product_id)
                       WHEN oi.product_type = 'Accessory' THEN (SELECT name FROM Accessories WHERE id = oi.product_id)
                       WHEN oi.product_type = 'Service' THEN (SELECT name FROM Services WHERE id = oi.product_id)
                   END as product_name,
                   CASE 
                       WHEN oi.product_type = 'NewPhone' THEN (SELECT image_url FROM NewPhones WHERE id = oi.product_id)
                       WHEN oi.product_type = 'UsedPhone' THEN (SELECT image_url FROM UsedPhones WHERE id = oi.product_id)
                       WHEN oi.product_type = 'Accessory' THEN (SELECT image_url FROM Accessories WHERE id = oi.product_id)
                       WHEN oi.product_type = 'Service' THEN (SELECT image_url FROM Services WHERE id = oi.product_id)
                   END as image_url
                FROM OrderItems oi
                WHERE oi.order_id = %s
            """
            cursor.execute(sql_items, (order['order_id'],))
            order['items'] = cursor.fetchall()

        conn.close()
        return jsonify({'client': client['full_name'], 'orders': orders})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# === ОНОВЛЕННЯ СТАТУСУ ЗАМОВЛЕННЯ ===
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

# === ЗАГАЛЬНИЙ API ДЛЯ КЛІЄНТА (ВСЕ РАЗОМ) ===
@app.route('/api/products', methods=['GET'])
def get_all_products():
    conn = get_db_connection()
    if not conn: return jsonify({'error': 'No DB'}), 500
    
    cursor = conn.cursor(dictionary=True)
    
    # ВИПРАВЛЕНО: Додані всі поля (color, memory, description...), яких не вистачало
    sql = """
        SELECT id, brand, model, color, memory, 'New' as condition_text, description, image_url, price, stock_quantity, 'NewPhone' as type 
        FROM NewPhones
        
        UNION ALL
        
        SELECT id, brand, model, color, memory, condition_text, description, image_url, price, stock_quantity, 'UsedPhone' as type 
        FROM UsedPhones
        
        UNION ALL
        
        SELECT id, 'Аксесуар' as brand, name as model, 'N/A' as color, 'N/A' as memory, 'New' as condition_text, description, image_url, price, stock_quantity, 'Accessory' as type 
        FROM Accessories
        
        UNION ALL
        
        SELECT id, 'Послуга' as brand, name as model, 'N/A' as color, 'N/A' as memory, 'N/A' as condition_text, description, image_url, price, NULL as stock_quantity, 'Service' as type 
        FROM Services
    """
    
    try:
        cursor.execute(sql)
        res = cursor.fetchall()
        return jsonify(res)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

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

# === ОФОРМЛЕННЯ ЗАМОВЛЕННЯ (ОНОВЛЕНО) ===
@app.route('/api/orders', methods=['POST'])
def create_order():
    try:
        data = request.json
        cart = data.get('cart')
        
        # Отримуємо нові поля з форми
        delivery = data.get('delivery')
        payment = data.get('payment')
        address = data.get('address')
        
        if not cart: return jsonify({'error': 'Кошик порожній'}), 400
        if not data.get('phone'): return jsonify({'error': 'Вкажіть телефон'}), 400

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # 1. ПОШУК / СТВОРЕННЯ КЛІЄНТА
        phone = data['phone']
        cursor.execute("SELECT client_id FROM Clients WHERE phone = %s", (phone,))
        existing_client = cursor.fetchone()

        if existing_client:
            client_id = existing_client['client_id']
            # Оновлюємо ім'я клієнта, якщо воно змінилося
            cursor.execute("UPDATE Clients SET full_name=%s, email=%s WHERE client_id=%s", 
                           (data['fullName'], data['email'], client_id))
        else:
            # Створюємо нового клієнта (адресу тут можна не писати, вона тепер в замовленні)
            sql_client = "INSERT INTO Clients (full_name, phone, email) VALUES (%s, %s, %s)"
            cursor.execute(sql_client, (data['fullName'], phone, data['email']))
            client_id = cursor.lastrowid

        # 2. СТВОРЕННЯ ЗАМОВЛЕННЯ (З АДРЕСОЮ І ДОСТАВКОЮ)
        total_amount = sum(float(item['price']) * int(item['quantity']) for item in cart)
        
        sql_order = """
            INSERT INTO Orders 
            (client_id, total_amount, status, delivery_method, payment_method, delivery_address) 
            VALUES (%s, %s, 'Прийнято', %s, %s, %s)
        """
        cursor.execute(sql_order, (client_id, total_amount, delivery, payment, address))
        order_id = cursor.lastrowid

        # 3. ДОДАВАННЯ ТОВАРІВ
        for item in cart:
            sql_item = """
                INSERT INTO OrderItems (order_id, product_type, product_id, quantity, price_at_purchase)
                VALUES (%s, %s, %s, %s, %s)
            """
            cursor.execute(sql_item, (order_id, item['type'], item['id'], item['quantity'], item['price']))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({'message': 'Замовлення успішно створено!', 'order_id': order_id}), 201

    except Exception as e:
        print("Order Error:", e)
        return jsonify({'error': str(e)}), 500
        

# ==========================================
# 4. ОТРИМАННЯ ЗАМОВЛЕНЬ ТА КЛІЄНТІВ (АДМІНКА)
# ==========================================

# Список ЗАМОВЛЕНЬ (з іменами клієнтів)
@app.route('/api/admin/orders', methods=['GET'])
def get_admin_orders():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    # JOIN з таблицею клієнтів, щоб бачити, хто замовив
    sql = """
        SELECT o.order_id, o.order_date, o.status, o.total_amount, o.delivery_method, o.payment_method,
               c.full_name, c.phone
        FROM Orders o
        JOIN Clients c ON o.client_id = c.client_id
        ORDER BY o.order_date DESC
    """
    cursor.execute(sql)
    orders = cursor.fetchall()
    conn.close()
    return jsonify(orders)

# Список КЛІЄНТІВ
@app.route('/api/admin/clients', methods=['GET'])
def get_admin_clients():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM Clients ORDER BY created_at DESC")
    clients = cursor.fetchall()
    conn.close()
    return jsonify(clients)

# Список ПРОДУКТІВ У ЗАМОВЛЕННЯХ (Деталі)
@app.route('/api/admin/order-items', methods=['GET'])
def get_admin_order_items():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    # Складний запит, який підтягує назву товару залежно від його типу
    sql = """
        SELECT oi.id, oi.order_id, oi.product_id, oi.quantity, oi.price_at_purchase, oi.product_type,
               CASE 
                   WHEN oi.product_type = 'NewPhone' THEN (SELECT CONCAT(brand, ' ', model) FROM NewPhones WHERE id = oi.product_id)
                   WHEN oi.product_type = 'UsedPhone' THEN (SELECT CONCAT(brand, ' ', model, ' (Б/У)') FROM UsedPhones WHERE id = oi.product_id)
                   WHEN oi.product_type = 'Accessory' THEN (SELECT name FROM Accessories WHERE id = oi.product_id)
                   WHEN oi.product_type = 'Service' THEN (SELECT name FROM Services WHERE id = oi.product_id)
                   ELSE 'Невідомий товар'
               END as product_name
        FROM OrderItems oi
        ORDER BY oi.order_id DESC
    """
    cursor.execute(sql)
    items = cursor.fetchall()
    conn.close()
    return jsonify(items)

# 5. ІСТОРІЯ ЗАМОВЛЕНЬ КЛІЄНТА (ПОШУК)
# ==========================================
@app.route('/api/client/orders', methods=['POST'])
def get_client_orders_history():
    try:
        data = request.json
        phone = data.get('phone')
        
        if not phone: return jsonify({'error': 'Введіть телефон'}), 400

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT client_id, full_name FROM Clients WHERE phone = %s", (phone,))
        client = cursor.fetchone()
        
        if not client:
            conn.close()
            return jsonify({'error': 'Клієнта не знайдено'}), 404
            
        cursor.execute("SELECT * FROM Orders WHERE client_id = %s ORDER BY order_date DESC", (client['client_id'],))
        orders = cursor.fetchall()
        
        for order in orders:
            # Для кожного замовлення беремо товари
            sql_items = """
                SELECT oi.quantity, oi.price_at_purchase, oi.product_type,
                   CASE 
                       WHEN oi.product_type = 'NewPhone' THEN (SELECT CONCAT(brand, ' ', model) FROM NewPhones WHERE id = oi.product_id)
                       WHEN oi.product_type = 'UsedPhone' THEN (SELECT CONCAT(brand, ' ', model, ' (Б/У)') FROM UsedPhones WHERE id = oi.product_id)
                       WHEN oi.product_type = 'Accessory' THEN (SELECT name FROM Accessories WHERE id = oi.product_id)
                       WHEN oi.product_type = 'Service' THEN (SELECT name FROM Services WHERE id = oi.product_id)
                   END as product_name,
                   CASE 
                       WHEN oi.product_type = 'NewPhone' THEN (SELECT image_url FROM NewPhones WHERE id = oi.product_id)
                       WHEN oi.product_type = 'UsedPhone' THEN (SELECT image_url FROM UsedPhones WHERE id = oi.product_id)
                       WHEN oi.product_type = 'Accessory' THEN (SELECT image_url FROM Accessories WHERE id = oi.product_id)
                       WHEN oi.product_type = 'Service' THEN (SELECT image_url FROM Services WHERE id = oi.product_id)
                   END as image_url
                FROM OrderItems oi
                WHERE oi.order_id = %s
            """
            cursor.execute(sql_items, (order['order_id'],))
            order['items'] = cursor.fetchall()

        conn.close()
        return jsonify({'client': client['full_name'], 'orders': orders})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# === ОНОВЛЕННЯ СТАТУСУ ЗАМОВЛЕННЯ ===
@app.route('/api/admin/orders/<int:order_id>/status', methods=['PUT'])
def update_order_status(order_id):
    try:
        data = request.json
        new_status = data.get('status')

        if not new_status:
            return jsonify({'error': 'Новий статус не передано'}), 400

        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Помилка з\'єднання з БД'}), 500

        cursor = conn.cursor()
        
        # Виконуємо запит на оновлення
        sql = "UPDATE Orders SET status = %s WHERE order_id = %s"
        cursor.execute(sql, (new_status, order_id))
        
        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({'message': 'Статус успішно оновлено!'}), 200

    except Exception as e:
        print(f"Status Update Error: {e}")
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)