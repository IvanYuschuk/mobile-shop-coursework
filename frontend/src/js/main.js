// frontend/src/js/main.js

// 1. Підключаємо стилі (Обов'язково для Vite)
import '../css/style.css';

// Адреса API (Бекенд Python)
const API_URL = 'http://127.0.0.1:5000/api/products';

// Тут зберігаємо всі товари
let allProducts = [];

// === СЛОВНИК КОЛЬОРІВ (Для малювання кружечків) ===
const colorMap = {
    'Black': '#212529',
    'White': '#f8f9fa',
    'Blue': '#0d6efd',
    'Pink': '#ffc0cb',
    'Yellow': '#ffeb3b',
    'Green': '#198754',
    'Purple': '#6f42c1',
    'Red': '#dc3545',
    'Orange': '#fd7e14',
    'Silver': '#c0c0c0',
    'Gray': '#808080',
    'Gold': '#ffd700',
    
    // Apple & Samsung Specific Colors
    'Midnight': '#191f26',
    'Starlight': '#f0fcf8',
    'Space Gray': '#4b4b4b',
    'Space Black': '#1a1a1a',
    'Deep Purple': '#4b3b5b',
    'Natural Titanium': '#d7d7d5',
    'Blue Titanium': '#2f3846',
    'White Titanium': '#f2f2f2',
    'Black Titanium': '#1e1e1e',
    'Desert Titanium': '#cdae88',
    'Teal': '#008080',
    'Ultramarine': '#3b4cca',
    'Titanium Gray': '#888888',
    'Navy': '#000080',
    'Violet': '#ee82ee',
    'Deep Blue': '#1a237e',       
    'Titanium Orange': '#e65100', 
    'Silver': '#e0e0e0',
    'Lavender': '#dcd0ff',   // Ніжний лавандовий
    'Mist Blue': '#b0c4de',  // Туманно-блакитний (сірувато-синій)
    'Sage': '#9caf88',       // Шавлія (приглушений зелений)
    'Black': '#1a1a1a',      // Глибокий чорний
    'White': '#f8f9fa',      // Чистий білий
};

// Допоміжна функція для отримання HEX коду
function getColorCode(colorName) {
    return colorMap[colorName] || colorName; // Якщо немає в словнику, повертаємо як є
}

// === 1. ЗАВАНТАЖЕННЯ ДАНИХ ===
async function loadProducts() {
    const container = document.getElementById('products-container');
    
    try {
        const response = await fetch(API_URL);
        
        if (!response.ok) {
            throw new Error(`Помилка сервера: ${response.status}`);
        }

        allProducts = await response.json(); // Зберігаємо дані
        
        // 1. Малюємо товари
        renderProducts(allProducts);

        const maxProductPrice = Math.max(...allProducts.map(p => parseFloat(p.price)));
        document.getElementById('price-max').placeholder = `До ${maxProductPrice}`;
        
        // 2. Малюємо фільтри кольорів (на основі отриманих даних)
        renderColorFilters(allProducts);
        
    } catch (error) {
        console.error('Помилка:', error);
        container.innerHTML = `
            <div class="alert alert-danger text-center w-100 mt-5">
                <h4>⚠️ Не вдалося завантажити товари</h4>
                <p>Перевір, чи запущено Python сервер (backend/app.py)</p>
                <small class="text-muted">${error.message}</small>
            </div>
        `;
    }
}

// === 2. РЕНДЕРИНГ ТОВАРІВ ===
function renderProducts(products) {
    const container = document.getElementById('products-container');
    const countLabel = document.getElementById('products-count');
    
    container.innerHTML = ''; // Очищаємо
    countLabel.innerText = products.length; // Оновлюємо лічильник

    if (products.length === 0) {
        container.innerHTML = '<div class="text-center text-muted w-100 py-5"><h5>Товарів не знайдено</h5></div>';
        return;
    }

    products.forEach(item => {
        // Визначаємо стилі бейджика
        let badgeClass = 'bg-success';
        let conditionLabel = item.condition_text;

        if (item.type === 'UsedPhone') {
            if (item.condition_text === 'Як новий') badgeClass = 'bg-info text-white';
            else if (item.condition_text === 'Хороший') badgeClass = 'bg-primary';
            else badgeClass = 'bg-warning text-dark';
        } else if (item.type === 'Accessory') {
            badgeClass = 'bg-secondary';
            conditionLabel = 'Аксесуар';
        } else if (item.type === 'Service') {
            badgeClass = 'bg-dark';
            conditionLabel = 'Послуга';
        }

        const cardHtml = `
            <div class="col-md-6 col-lg-4">
                <div class="card h-100 product-card shadow-sm border-0">
                    <div class="position-relative text-center p-3" style="height: 220px; overflow: hidden; background: #fff;">
                        <img src="${item.image_url || 'https://via.placeholder.com/300?text=No+Image'}" 
                             alt="${item.model}" 
                             class="img-fluid" 
                             style="max-height: 100%; object-fit: contain;">
                        
                        <span class="position-absolute top-0 end-0 m-2 badge ${badgeClass} shadow-sm">
                            ${conditionLabel}
                        </span>
                    </div>

                    <div class="card-body d-flex flex-column pt-2">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <span class="text-uppercase fw-bold text-muted small" style="font-size: 0.75rem;">${item.brand}</span>
                        </div>
                        
                        <h5 class="card-title fw-bold text-dark mb-1">${item.model}</h5>
                        <p class="text-muted small text-truncate mb-3">${item.description || ''}</p>
                        
                        ${(item.type === 'NewPhone' || item.type === 'UsedPhone') ? 
                        `<div class="mt-auto bg-light rounded p-2 mb-3 small border">
                            <div class="d-flex justify-content-between">
                                <span class="text-muted">Пам'ять:</span> <strong>${item.memory}</strong>
                            </div>
                            <div class="d-flex justify-content-between">
                                <span class="text-muted">Колір:</span> 
                                <span class="d-flex align-items-center gap-1">
                                    <span style="width: 10px; height: 10px; background-color: ${getColorCode(item.color)}; border-radius: 50%; border: 1px solid #ccc; display: inline-block;"></span>
                                    ${item.color}
                                </span>
                            </div>
                         </div>` : '<div class="mt-auto mb-3"></div>'}

                        <div class="d-flex justify-content-between align-items-center mt-2 border-top pt-3">
                            <h4 class="text-primary mb-0 fw-bold">${item.price} ₴</h4>
                            <button class="btn btn-primary rounded-circle btn-sm p-2 shadow-sm" title="Купити">
                                <i class="fa-solid fa-cart-shopping"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += cardHtml;
    });
}

// === 3. РЕНДЕРИНГ ФІЛЬТРІВ КОЛЬОРІВ (ДИНАМІЧНО) ===
function renderColorFilters(products) {
    const container = document.getElementById('color-filters-container');
    container.innerHTML = ''; 

    const uniqueColors = new Set();
    products.forEach(item => {
        if (item.color && item.color !== 'N/A') {
            uniqueColors.add(item.color);
        }
    });

    if (uniqueColors.size === 0) {
        container.innerHTML = '<small class="text-muted">Немає варіантів</small>';
        return;
    }

    uniqueColors.forEach(colorName => {
        const bgCode = getColorCode(colorName);
        
        const html = `
            <div class="form-check p-0" title="${colorName}">
                <input type="checkbox" class="btn-check filter-color" 
                       id="filter-color-${colorName.replace(/\s+/g, '')}" 
                       value="${colorName}" 
                       autocomplete="off">
                
                <label class="btn btn-outline-secondary btn-sm rounded-circle d-flex align-items-center justify-content-center shadow-sm position-relative" 
                       for="filter-color-${colorName.replace(/\s+/g, '')}" 
                       style="width: 35px; height: 35px; background-color: ${bgCode}; border: 1px solid #dee2e6;">
                       <i class="fa-solid fa-check text-white d-none check-icon" style="text-shadow: 0 0 3px black;"></i>
                </label>
            </div>
        `;
        container.innerHTML += html;
    });

    // Додаємо події кліку на нові чекбокси
    document.querySelectorAll('.filter-color').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const label = document.querySelector(`label[for="${e.target.id}"]`);
            const icon = label.querySelector('.check-icon');
            if (e.target.checked) icon.classList.remove('d-none');
            else icon.classList.add('d-none');
            
            applyFilters(); // Запускаємо фільтрацію при кліку
        });
    });
}


// === 4. ЛОГІКА ФІЛЬТРАЦІЇ ===
function applyFilters() {
    const searchText = document.getElementById('search-input').value.toLowerCase();
    const conditionValue = document.getElementById('condition-filter').value;
    
    // Отримуємо ціни (якщо поле пусте, беремо 0 або Нескінченність)
    const minPrice = parseFloat(document.getElementById('price-min').value) || 0;
    const maxPrice = parseFloat(document.getElementById('price-max').value) || Infinity;
    
    // Збираємо вибрані чекбокси
    const getCheckedValues = (cls) => Array.from(document.querySelectorAll(`${cls}:checked`)).map(cb => cb.value);

    const selectedBrands = getCheckedValues('.filter-brand');
    const selectedMemories = getCheckedValues('.filter-memory');
    const selectedColors = getCheckedValues('.filter-color');

    const filteredProducts = allProducts.filter(item => {
        // 1. Пошук
        const matchesSearch = item.model.toLowerCase().includes(searchText) || 
                              item.brand.toLowerCase().includes(searchText);

        // 2. Бренд
        const matchesBrand = selectedBrands.length === 0 || selectedBrands.includes(item.brand);

        // 3. Стан
        let matchesCondition = true;
        if (conditionValue !== 'all') {
            matchesCondition = (item.type === conditionValue);
        }

        // 4. Пам'ять
        let matchesMemory = true;
        if (selectedMemories.length > 0) {
            matchesMemory = item.memory && selectedMemories.includes(item.memory);
        }

        // 5. Колір
        let matchesColor = true;
        if (selectedColors.length > 0) {
            matchesColor = item.color && selectedColors.includes(item.color);
        }

        // 6. ЦІНА (НОВЕ!)
        // item.price може бути рядком "100.00", тому перетворюємо в число
        const itemPrice = parseFloat(item.price);
        const matchesPrice = itemPrice >= minPrice && itemPrice <= maxPrice;

        return matchesSearch && matchesBrand && matchesCondition && matchesMemory && matchesColor && matchesPrice;
    });

    renderProducts(filteredProducts);
}

// === 5. ЗАПУСК ПРИ СТАРТІ ===
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();

    // Слухачі подій
    document.getElementById('search-btn').addEventListener('click', applyFilters);
    document.getElementById('search-input').addEventListener('input', applyFilters);
    document.getElementById('apply-filters').addEventListener('click', applyFilters);
    document.getElementById('condition-filter').addEventListener('change', applyFilters);
    document.getElementById('price-min').addEventListener('input', applyFilters);
    document.getElementById('price-max').addEventListener('input', applyFilters);

    // Слухачі для статичних чекбоксів (Бренд, Пам'ять)
    document.querySelectorAll('.filter-brand, .filter-memory').forEach(cb => {
        cb.addEventListener('change', applyFilters);
    });

    document.getElementById('reset-filters').addEventListener('click', () => {
        document.querySelectorAll('input[type=checkbox]').forEach(cb => {
            cb.checked = false;
            // Прибираємо галочки з кольорів візуально
            const label = document.querySelector(`label[for="${cb.id}"]`);
            if(label) {
                const icon = label.querySelector('.check-icon');
                if(icon) icon.classList.add('d-none');
            }
        });
        document.getElementById('search-input').value = '';
        document.getElementById('condition-filter').value = 'all';
        document.querySelectorAll('input[type=checkbox]').forEach(cb => {
            cb.checked = false;
            const label = document.querySelector(`label[for="${cb.id}"]`);
            if(label) label.querySelector('.check-icon')?.classList.add('d-none');
        });
        document.getElementById('search-input').value = '';
        document.getElementById('condition-filter').value = 'all';
        
        // ОЧИЩАЄМО ЦІНУ
        document.getElementById('price-min').value = '';
        document.getElementById('price-max').value = '';
        
        applyFilters();
    });
});