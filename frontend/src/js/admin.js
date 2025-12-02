import '../css/style.css';
import iziToast from "izitoast";
import 'izitoast/dist/css/iziToast.min.css';

const BASE_URL = 'http://127.0.0.1:5000/api';
let allItems = [];
let editMode = false;

// === 1. ЗАВАНТАЖЕННЯ ДАНИХ ===

async function loadPhones() {
    const tbody = document.getElementById('table-phones');
    try {
        const res = await fetch(`${BASE_URL}/phones`);
        const phones = await res.json();
        allItems = allItems.concat(phones);

        tbody.innerHTML = '';
        phones.forEach(item => {
            const badge = item.type === 'NewPhone' 
                ? '<span class="badge bg-success">Новий</span>' 
                : '<span class="badge bg-warning text-dark">Б/У</span>';
            
            tbody.innerHTML += `
                <tr>
                    <td>${item.id}</td>
                    <td><img src="${item.image_url || ''}" style="width:40px; height:40px; object-fit:contain;"></td>
                    <td class="fw-bold">${item.brand} ${item.model} <br>${badge}</td>
                    <td class="small text-muted">${item.memory}, ${item.color}</td>
                    <td>${item.price} ₴</td>
                    <td>${item.stock_quantity} шт.</td>
                    <td class="text-end">${getActionButtons(item.id, item.type)}</td>
                </tr>
            `;
        });
    } catch (e) { console.error(e); }
}

async function loadAccessories() {
    const tbody = document.getElementById('table-accessories');
    try {
        const res = await fetch(`${BASE_URL}/accessories`);
        const items = await res.json();
        allItems = allItems.concat(items);

        tbody.innerHTML = '';
        items.forEach(item => {
            tbody.innerHTML += `
                <tr>
                    <td>${item.id}</td>
                    <td><img src="${item.image_url || ''}" style="width:40px; height:40px; object-fit:contain;"></td>
                    <td class="fw-bold">${item.model}</td>
                    <td class="small text-muted text-truncate" style="max-width: 150px;">${item.description || ''}</td>
                    <td>${item.price} ₴</td>
                    <td>${item.stock_quantity} шт.</td>
                    <td class="text-end">${getActionButtons(item.id, item.type)}</td>
                </tr>
            `;
        });
    } catch (e) { console.error(e); }
}

async function loadServices() {
    const tbody = document.getElementById('table-services');
    try {
        const res = await fetch(`${BASE_URL}/services`);
        const items = await res.json();
        allItems = allItems.concat(items);

        tbody.innerHTML = '';
        items.forEach(item => {
            tbody.innerHTML += `
                <tr>
                    <td>${item.id}</td>
                    <td><img src="${item.image_url || ''}" style="width:40px; height:40px; object-fit:contain;"></td>
                    <td class="fw-bold">${item.model}</td>
                    <td class="small text-muted text-truncate" style="max-width:150px;">${item.description || ''}</td>
                    <td>${item.price} ₴</td>
                    <td class="text-end">${getActionButtons(item.id, item.type)}</td>
                </tr>
            `;
        });
    } catch (e) { console.error(e); }
}

// === НОВІ ФУНКЦІЇ ЗАВАНТАЖЕННЯ (ЗАМОВЛЕННЯ, КЛІЄНТИ) ===

// ... (Ваш попередній код loadServices)

// === НОВІ ФУНКЦІЇ ЗАВАНТАЖЕННЯ (ЗАМОВЛЕННЯ, КЛІЄНТИ) ===

async function loadOrders() {
    const tbody = document.getElementById('table-orders');
    try {
        const res = await fetch(`${BASE_URL}/admin/orders`);
        const orders = await res.json();
        tbody.innerHTML = '';
        orders.forEach(order => {
            const date = new Date(order.order_date).toLocaleString('uk-UA');
            
            // Замість span викликаємо функцію, що генерує select
            const statusDropdown = generateStatusSelect(order.order_id, order.status);

            tbody.innerHTML += `
            <tr>
                <td class="fw-bold">#${order.order_id}</td>
                <td>${date}</td>
                <td>
                    <div class="fw-bold">${order.full_name}</div>
                    <div class="small text-muted">${order.phone}</div>
                </td>
                <td class="fw-bold text-success">${order.total_amount} ₴</td>
                <td>${order.delivery_method}</td>
                <td>${statusDropdown}</td> </tr>
            `;
        });
    } catch (e) { console.error(e); }
}

// Допоміжна функція для створення Dropdown зі статусами
function generateStatusSelect(orderId, currentStatus) {
    const statuses = [
        'Прийнято', 
        'Сформовано', 
        'Відправлено', 
        'Доставлено', 
        'Отримано', 
        'Скасовано'
    ];

    // Визначаємо колір рамки залежно від статусу (для краси)
    let borderClass = 'border-secondary';
    if (currentStatus === 'Скасовано') borderClass = 'border-danger text-danger';
    if (['Доставлено', 'Отримано'].includes(currentStatus)) borderClass = 'border-success text-success';
    if (currentStatus === 'Відправлено') borderClass = 'border-info text-info';

    let options = '';
    statuses.forEach(status => {
        const isSelected = status === currentStatus ? 'selected' : '';
        options += `<option value="${status}" ${isSelected}>${status}</option>`;
    });

    // onchange викликає функцію оновлення
    return `
    <select 
        class="form-select form-select-sm fw-bold ${borderClass}" 
        onchange="window.updateOrderStatus(${orderId}, this.value, this)"
        style="width: 140px;"
    >
        ${options}
    </select>`;
}

// Функція відправки зміни статусу на сервер
window.updateOrderStatus = async function(orderId, newStatus, selectElement) {
    try {
        // Припускаємо, що API endpoint виглядає так (потрібно додати в Python)
        const res = await fetch(`${BASE_URL}/admin/orders/${orderId}/status`, {
            method: 'PUT', // або PATCH
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        if (res.ok) {
            iziToast.success({
                title: 'Оновлено',
                message: `Статус замовлення #${orderId} змінено на "${newStatus}"`,
                position: 'topRight'
            });
            
            // Оновлюємо колір селекта без перезавантаження сторінки
            selectElement.className = 'form-select form-select-sm fw-bold';
            if (newStatus === 'Скасовано') selectElement.classList.add('border-danger', 'text-danger');
            else if (['Доставлено', 'Отримано'].includes(newStatus)) selectElement.classList.add('border-success', 'text-success');
            else if (newStatus === 'Відправлено') selectElement.classList.add('border-info', 'text-info');
            else selectElement.classList.add('border-secondary');

        } else {
            const err = await res.json();
            iziToast.error({
                title: 'Помилка',
                message: err.error || 'Не вдалося змінити статус',
                position: 'topRight'
            });
            // Якщо помилка - повертаємо старий статус (перезавантажуємо таблицю)
            setTimeout(() => loadOrders(), 2000); 
        }
    } catch (e) {
        console.error(e);
        iziToast.error({ title: 'Помилка', message: 'Збій сервера' });
    }
}


async function loadOrderItems() {
    const tbody = document.getElementById('table-order-items');
    try {
        const res = await fetch(`${BASE_URL}/admin/order-items`);
        const items = await res.json();
        tbody.innerHTML = '';
        items.forEach(item => {
            tbody.innerHTML += `
                <tr>
                    <td>#${item.order_id}</td>
                    <td>${item.product_id}</td>
                    <td class="fw-bold">${item.product_name}</td>
                    <td><span class="badge bg-secondary">${item.product_type}</span></td>
                    <td>${item.price_at_purchase} ₴</td>
                    <td>${item.quantity}</td>
                </tr>
            `;
        });
    } catch (e) { console.error(e); }
}

async function loadClients() {
    const tbody = document.getElementById('table-clients');
    try {
        const res = await fetch(`${BASE_URL}/admin/clients`);
        const clients = await res.json();
        tbody.innerHTML = '';
        clients.forEach(client => {
            const date = new Date(client.created_at).toLocaleDateString('uk-UA');
            tbody.innerHTML += `
                <tr>
                    <td>${client.client_id}</td>
                    <td class="fw-bold">${client.full_name}</td>
                    <td>${client.phone}</td>
                    <td>${client.email || '-'}</td>
                    <td>${date}</td>
                </tr>
            `;
        });
    } catch (e) { console.error(e); }
}

// --------------------------------------------------------
function getActionButtons(id, type) {
    return `
        <button class="btn btn-sm btn-outline-primary me-1" onclick="window.openModal('edit', ${id}, '${type}')">
            <i class="fa-solid fa-pen"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="window.deleteProduct(${id}, '${type}')">
            <i class="fa-solid fa-trash"></i>
        </button>
    `;
}

// === ЛОГІКА ПРИХОВУВАННЯ ПОЛІВ ===
function toggleFields(type) {
    const brandField = document.getElementById('field-brand');
    const phoneFields = document.querySelector('.field-phone');
    const usedFields = document.querySelector('.field-used');
    const stockField = document.getElementById('field-stock');

    // Скидаємо видимість
    phoneFields.classList.add('d-none');
    usedFields.classList.add('d-none');
    brandField.classList.remove('d-none');
    stockField.classList.remove('d-none');

    if (type === 'NewPhone') {
        phoneFields.classList.remove('d-none'); 
    } 
    else if (type === 'UsedPhone') {
        phoneFields.classList.remove('d-none');
        usedFields.classList.remove('d-none');
    }
    else if (type === 'Service') {
        brandField.classList.add('d-none');
        stockField.classList.add('d-none');
    }
}

document.getElementById('p-type').addEventListener('change', (e) => {
    toggleFields(e.target.value);
});


// === 2. ВІДКРИТТЯ МОДАЛКИ ===
window.openModal = function(mode, id = null, type = null) {
    const modal = new bootstrap.Modal(document.getElementById('editModal'));
    const form = document.getElementById('product-form');
    
    form.reset();
    
    if (mode === 'add') {
        editMode = false;
        document.getElementById('modal-title').innerText = "Додати новий товар";
        document.getElementById('p-id').value = '';
        document.getElementById('p-type').value = 'NewPhone';
        toggleFields('NewPhone'); 
        
    } else {
        editMode = true;
        document.getElementById('modal-title').innerText = "Редагувати товар";
        
        const item = allItems.find(p => p.id == id && p.type === type);
        
        if (item) {
            document.getElementById('p-id').value = item.id;
            document.getElementById('p-type').value = item.type;
            
            toggleFields(item.type);

            document.getElementById('p-brand').value = item.brand || '';
            document.getElementById('p-model').value = item.model;
            document.getElementById('p-price').value = item.price;
            document.getElementById('p-stock').value = item.stock_quantity;
            document.getElementById('p-image').value = item.image_url;
            document.getElementById('p-desc').value = item.description;
            
            if (item.type === 'NewPhone' || item.type === 'UsedPhone') {
                document.getElementById('p-color').value = item.color;
                document.getElementById('p-memory').value = item.memory;
            }
            
            if (item.type === 'UsedPhone') {
                document.getElementById('p-condition').value = item.condition_text;
                document.getElementById('p-battery').value = item.battery_health;
            }
        }
    }
    modal.show();
}

// === 3. ЗБЕРЕЖЕННЯ (ADD / UPDATE) ===
document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('p-id').value;
    const type = document.getElementById('p-type').value;
    
    const data = {
        type: type,
        brand: document.getElementById('p-brand').value,
        model: document.getElementById('p-model').value,
        price: document.getElementById('p-price').value,
        stock_quantity: document.getElementById('p-stock').value || 0,
        image_url: document.getElementById('p-image').value,
        description: document.getElementById('p-desc').value,
        color: document.getElementById('p-color').value,
        memory: document.getElementById('p-memory').value,
        condition_text: document.getElementById('p-condition').value,
        battery_health: document.getElementById('p-battery').value
    };

    let url = `${BASE_URL}/products`;
    let method = 'POST';

    if (editMode) {
        url = `${BASE_URL}/products/${id}`; 
        method = 'PUT';
    }

    try {
        const res = await fetch(url, {
            method: method,
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
        
        if (res.ok) {
            iziToast.success({
                title: 'Успішно',
                message: 'Товар збережено!',
                position: 'topRight'
            });
            setTimeout(() => location.reload(), 1000); // Оновлюємо сторінку через 1 сек
        } else {
            const err = await res.json();
            iziToast.error({
                title: 'Помилка',
                message: err.error || 'Щось пішло не так',
                position: 'topRight'
            });
        }
    } catch (err) {
        console.error(err);
        iziToast.error({ title: 'Помилка', message: 'Немає з\'єднання з сервером', position: 'topRight' });
    }
});

// === 4. ВИДАЛЕННЯ (ЗАМІСТЬ CONFIRM - ЗАПИТ IZITOAST) ===
window.deleteProduct = function(id, type) {
    iziToast.question({
        timeout: 10000,
        close: false,
        overlay: true,
        displayMode: 'once',
        id: 'question',
        zindex: 999,
        title: 'Видалення',
        message: 'Ви впевнені, що хочете видалити цей товар?',
        position: 'center',
        buttons: [
            ['<button><b>Так</b></button>', async function (instance, toast) {
                instance.hide({ transitionOut: 'fadeOut' }, toast, 'button');
                
                // Виконуємо видалення після натискання "Так"
                try {
                    const res = await fetch(`${BASE_URL}/products/${id}?type=${type}`, { method: 'DELETE' });
                    if (res.ok) {
                        iziToast.success({
                            title: 'Видалено',
                            message: 'Товар успішно видалено!',
                            position: 'topRight'
                        });
                        setTimeout(() => location.reload(), 1000);
                    } else {
                        const err = await res.json();
                        iziToast.error({ title: 'Помилка', message: err.error });
                    }
                } catch (e) { 
                    console.error(e);
                    iziToast.error({ title: 'Помилка', message: 'Збій сервера' });
                }

            }, true],
            ['<button>Ні</button>', function (instance, toast) {
                instance.hide({ transitionOut: 'fadeOut' }, toast, 'button');
            }],
        ],
    });
}

// Вихід
document.getElementById('logout-btn').onclick = () => {
    localStorage.removeItem('isAdmin');
    iziToast.info({ title: 'Вихід', message: 'Сеанс завершено', position: 'topCenter' });
    setTimeout(() => window.location.href = '/login.html', 1000);
};

document.addEventListener('DOMContentLoaded', () => {
    allItems = [];
    loadPhones();
    loadAccessories();
    loadServices();
    loadOrders();
    loadOrderItems();
    loadClients();
});