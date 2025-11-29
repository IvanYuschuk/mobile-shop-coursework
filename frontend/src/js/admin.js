import '../css/style.css';

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
                    <td class="small text-muted text-truncate" style="max-width: 150px;">${item.description || ''}</td>
                    <td>${item.price} ₴</td>
                    <td class="text-end">${getActionButtons(item.id, item.type)}</td>
                </tr>
            `;
        });
    } catch (e) { console.error(e); }
}

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

    // Скидаємо видимість (ховаємо специфічні, показуємо загальні)
    phoneFields.classList.add('d-none');
    usedFields.classList.add('d-none');
    brandField.classList.remove('d-none');
    stockField.classList.remove('d-none');

    if (type === 'NewPhone') {
        phoneFields.classList.remove('d-none'); // Колір, Пам'ять
    } 
    else if (type === 'UsedPhone') {
        phoneFields.classList.remove('d-none');
        usedFields.classList.remove('d-none');  // Стан, Батарея
    }
    else if (type === 'Service') {
        // У послуг немає бренду і складу
        brandField.classList.add('d-none');
        stockField.classList.add('d-none');
    }
    // Для Accessory нічого не змінюємо (показуємо Бренд і Склад, ховаємо телефонні поля)
}

// Слухач на зміну типу в формі
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
        
        // За замовчуванням Новий телефон
        document.getElementById('p-type').value = 'NewPhone';
        toggleFields('NewPhone'); 
        
    } else {
        editMode = true;
        document.getElementById('modal-title').innerText = "Редагувати товар";
        
        const item = allItems.find(p => p.id == id && p.type === type);
        
        if (item) {
            document.getElementById('p-id').value = item.id;
            document.getElementById('p-type').value = item.type;
            
            // Оновлюємо видимість полів
            toggleFields(item.type);

            document.getElementById('p-brand').value = item.brand || '';
            document.getElementById('p-model').value = item.model;
            document.getElementById('p-price').value = item.price;
            document.getElementById('p-stock').value = item.stock_quantity;
            document.getElementById('p-image').value = item.image_url;
            document.getElementById('p-desc').value = item.description;
            
            // Якщо це телефон
            if (item.type === 'NewPhone' || item.type === 'UsedPhone') {
                document.getElementById('p-color').value = item.color;
                document.getElementById('p-memory').value = item.memory;
            }
            
            // Якщо це Б/У
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
            alert('Збережено!');
            location.reload();
        } else {
            alert('Помилка сервера');
        }
    } catch (err) {
        console.error(err);
    }
});

// === 4. ВИДАЛЕННЯ ===
window.deleteProduct = async function(id, type) {
    if(!confirm('Ви впевнені?')) return;
    try {
        const res = await fetch(`${BASE_URL}/products/${id}?type=${type}`, { method: 'DELETE' });
        if (res.ok) {
            alert('Видалено!');
            location.reload();
        } else {
            alert('Помилка!');
        }
    } catch (e) { console.error(e); }
}

document.getElementById('logout-btn').onclick = () => {
    localStorage.removeItem('isAdmin');
    window.location.href = '/login.html';
};

document.addEventListener('DOMContentLoaded', () => {
    allItems = [];
    loadPhones();
    loadAccessories();
    loadServices();
});