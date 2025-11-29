import '../css/style.css';
import { Modal } from 'bootstrap'; // Імпортуємо Bootstrap Modal для JS керування
import { addToCart, updateCartCounter, renderCartModal, changeQuantity, removeFromCart, clearCart } from './cart.js';

// Робимо функції доступними для HTML
window.addToCartGlobal = (id) => {
    const product = allProducts.find(p => p.id === id);
    if (product) addToCart(product);
};
    
// Функції керування кошиком
window.cartChange = changeQuantity;
window.cartRemove = removeFromCart;
window.cartClear = clearCart;
    
const API_URL = 'http://127.0.0.1:5000/api/products';
let allProducts = [];

// === СЛОВНИК КОЛЬОРІВ ===
const colorMap = {
    'Black': '#212529', 'White': '#f8f9fa', 'Blue': '#0d6efd', 'Pink': '#ffc0cb',
    'Yellow': '#ffeb3b', 'Green': '#198754', 'Purple': '#6f42c1', 'Red': '#dc3545',
    'Orange': '#fd7e14', 'Silver': '#c0c0c0', 'Gray': '#808080', 'Gold': '#ffd700',
    'Midnight': '#191f26', 'Starlight': '#f0fcf8', 'Space Gray': '#4b4b4b',
    'Space Black': '#1a1a1a', 'Deep Purple': '#4b3b5b', 'Natural Titanium': '#d7d7d5',
    'Blue Titanium': '#2f3846', 'White Titanium': '#f2f2f2', 'Black Titanium': '#1e1e1e',
    'Desert Titanium': '#cdae88', 'Teal': '#008080', 'Ultramarine': '#3b4cca',
    'Titanium Gray': '#888888', 'Navy': '#000080', 'Violet': '#ee82ee',
    'Deep Blue': '#1a237e', 'Titanium Orange': '#e65100', 'Lavender': '#dcd0ff',
    'Mist Blue': '#b0c4de', 'Sage': '#9caf88', 'Cosmic Orange': '#ff6b35', 'Light Gold':'#F1E5AC'
};

function getColorCode(name) { return colorMap[name] || name; }

// === 1. ЗАВАНТАЖЕННЯ ===
async function loadProducts() {
    const container = document.getElementById('products-container');
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`Помилка: ${response.status}`);
        allProducts = await response.json();
        
        renderProducts(allProducts);
        
        // Ціна
        const maxPrice = Math.max(...allProducts.map(p => parseFloat(p.price)));
        const priceMaxInput = document.getElementById('price-max');
        if (priceMaxInput) priceMaxInput.placeholder = `До ${maxPrice}`;
        
        renderColorFilters(allProducts);
    } catch (error) {
        console.error(error);
        container.innerHTML = `<div class="alert alert-danger text-center w-100 mt-5">Помилка завантаження: ${error.message}</div>`;
    }
}

// === 2. РЕНДЕРИНГ КАРТОК ===
function renderProducts(products) {
    const container = document.getElementById('products-container');
    const countLabel = document.getElementById('products-count');
    
    container.innerHTML = '';
    if (countLabel) countLabel.innerText = products.length;

    if (products.length === 0) {
        container.innerHTML = '<div class="text-center text-muted w-100 py-5"><h5>Товарів не знайдено</h5></div>';
        return;
    }

    products.forEach(item => {
        let badgeClass = 'bg-success';
        let conditionLabel = item.condition_text;

        if (item.type === 'UsedPhone') {
            badgeClass = item.condition_text === 'Як новий' ? 'bg-info text-white' : 'bg-warning text-dark';
        } else if (item.type === 'Accessory') {
            badgeClass = 'bg-secondary'; conditionLabel = 'Аксесуар';
        } else if (item.type === 'Service') {
            badgeClass = 'bg-dark'; conditionLabel = 'Послуга';
        }

        const cardHtml = `
            <div class="col-md-6 col-lg-4">
                <div class="card h-100 product-card shadow-sm border-0" 
                     style="cursor: pointer; transition: transform 0.2s;"
                     onclick="window.openProductModal(${item.id})"> <!-- ДОДАНО ONCLICK -->
                    
                    <div class="position-relative text-center p-3" style="height: 240px; overflow: hidden; background: #fff;">
                        <img src="${item.image_url || 'https://via.placeholder.com/300?text=No+Image'}" 
                             alt="${item.model}" class="img-fluid" style="max-height: 100%; object-fit: contain;">
                        <span class="position-absolute top-0 end-0 m-2 badge ${badgeClass} shadow-sm">${conditionLabel}</span>
                    </div>

                    <div class="card-body d-flex flex-column pt-2">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <span class="text-uppercase fw-bold text-muted small" style="font-size: 0.75rem;">${item.brand}</span>
                        </div>
                        <h5 class="card-title fw-bold text-dark mb-1">${item.model}</h5>
                        
                        ${(item.type.includes('Phone')) ? 
                        `<div class="mt-auto bg-light rounded p-2 mb-3 small border">
                            <div class="d-flex justify-content-between">
                                <span class="text-muted">Пам'ять:</span> <strong>${item.memory}</strong>
                            </div>
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="text-muted">Колір:</span> 
                                <span class="d-flex align-items-center gap-1">
                                    <span style="width: 12px; height: 12px; background-color: ${getColorCode(item.color)}; border-radius: 50%; border: 1px solid #ddd;"></span>
                                    ${item.color}
                                </span>
                            </div>
                         </div>` : '<div class="mt-auto mb-3"></div>'}

                        <div class="d-flex justify-content-between align-items-center mt-2 border-top pt-3">
                            <h4 class="text-primary mb-0 fw-bold">${item.price} ₴</h4>
                            <button class="btn btn-primary rounded-circle btn-sm p-2 shadow-sm" 
                                    title="Купити"
                                    onclick="event.stopPropagation(); window.addToCartGlobal(${item.id})"> <!-- stopPropagation щоб не відкривалась модалка товару -->
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

// === 3. ЛОГІКА МОДАЛЬНОГО ВІКНА (НОВЕ!) ===
window.openProductModal = function(id) {
    // Шукаємо товар у пам'яті (allProducts вже завантажено)
    const product = allProducts.find(p => p.id === id);
    if (!product) return;

    // Заповнюємо дані
    document.getElementById('modal-img').src = product.image_url || 'https://via.placeholder.com/300';
    document.getElementById('modal-brand').innerText = product.brand;
    document.getElementById('modal-title').innerText = product.model;
    document.getElementById('modal-price').innerText = `${product.price} ₴`;
    document.getElementById('modal-desc').innerText = product.description || 'Опис відсутній.';

    // Бейджик (Новий/Б/У)
    const badge = document.getElementById('modal-badge');
    badge.innerText = product.condition_text || 'Новий';
    badge.className = 'badge rounded-pill ms-2'; // Скидання класів
    if (product.type === 'UsedPhone') badge.classList.add('bg-warning', 'text-dark');
    else if (product.type === 'Accessory') badge.classList.add('bg-secondary');
    else badge.classList.add('bg-success');

    // Характеристики (Таблиця)
    const specsContainer = document.getElementById('modal-specs');
    let specsHtml = '';

    if (product.type.includes('Phone')) {
        specsHtml += `
            <div class="d-flex justify-content-between mb-2 border-bottom pb-2">
                <span class="text-muted">Пам'ять:</span>
                <span class="fw-bold">${product.memory}</span>
            </div>
            <div class="d-flex justify-content-between mb-2 border-bottom pb-2">
                <span class="text-muted">Колір:</span>
                <span class="fw-bold d-flex align-items-center gap-2">
                    <span style="width: 16px; height: 16px; background-color: ${getColorCode(product.color)}; border-radius: 50%; border: 1px solid #ccc;"></span>
                    ${product.color}
                </span>
            </div>
        `;
    }
    
    // Якщо Б/У - додаємо батарею
    if (product.type === 'UsedPhone' && product.battery_health) {
        specsHtml += `
            <div class="d-flex justify-content-between mb-2 border-bottom pb-2">
                <span class="text-muted">Стан акумулятора:</span>
                <span class="fw-bold text-success">${product.battery_health}%</span>
            </div>
        `;
    }

    // Якщо є на складі
    specsHtml += `
        <div class="d-flex justify-content-between">
            <span class="text-muted">Наявність:</span>
            <span class="${(product.stock_quantity > 0 || product.type === 'Service') ? 'text-success' : 'text-danger'} fw-bold">
                ${(product.stock_quantity > 0 || product.type === 'Service') ? 'Є в наявності' : 'Немає на складі'}
            </span>
        </div>
    `;

    specsContainer.innerHTML = specsHtml;

    // Кнопка Купити
    document.getElementById('modal-buy-btn').onclick = () => {
        addToCart(product); // Тут можна викликати пряму функцію, бо ми всередині модуля
        // Можна закрити модалку товару, якщо хочеш
        // myModal.hide();
    };

    // Відкриваємо вікно
    const myModal = new Modal(document.getElementById('productModal'));
    myModal.show();
};

// === 4. ФІЛЬТРИ (Твій старий код без змін, але скорочений тут для ясності) ===
function renderColorFilters(products) {
    const container = document.getElementById('color-filters-container');
    if (!container) return; // Захист від помилки на інших сторінках
    container.innerHTML = ''; 
    const uniqueColors = new Set();
    products.forEach(item => { if (item.color && item.color !== 'N/A') uniqueColors.add(item.color); });
    
    if (uniqueColors.size === 0) { container.innerHTML = '<small class="text-muted">Немає варіантів</small>'; return; }

    uniqueColors.forEach(colorName => {
        const bgCode = getColorCode(colorName);
        const html = `
            <div class="form-check p-0" title="${colorName}">
                <input type="checkbox" class="btn-check filter-color" id="filter-${colorName.replace(/\s+/g, '')}" value="${colorName}" autocomplete="off">
                <label class="btn btn-outline-secondary btn-sm rounded-circle d-flex align-items-center justify-content-center shadow-sm position-relative" 
                       for="filter-${colorName.replace(/\s+/g, '')}" 
                       style="width: 30px; height: 30px; background-color: ${bgCode}; border: 1px solid #dee2e6;">
                       <i class="fa-solid fa-check text-white d-none check-icon" style="text-shadow: 0 0 2px black; font-size: 0.7rem;"></i>
                </label>
            </div>`;
        container.innerHTML += html;
    });

    document.querySelectorAll('.filter-color').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const icon = document.querySelector(`label[for="${e.target.id}"] .check-icon`);
            if(icon) e.target.checked ? icon.classList.remove('d-none') : icon.classList.add('d-none');
            applyFilters();
        });
    });
}

function applyFilters() {
    const searchText = document.getElementById('search-input')?.value.toLowerCase() || '';
    const conditionValue = document.getElementById('condition-filter')?.value || 'all';
    const minPrice = parseFloat(document.getElementById('price-min')?.value) || 0;
    const maxPrice = parseFloat(document.getElementById('price-max')?.value) || Infinity;
    
    const getValues = (sel) => Array.from(document.querySelectorAll(`${sel}:checked`)).map(cb => cb.value);
    const brands = getValues('.filter-brand');
    const memories = getValues('.filter-memory');
    const colors = getValues('.filter-color');

    const filtered = allProducts.filter(item => {
        const matchSearch = item.model.toLowerCase().includes(searchText) || item.brand.toLowerCase().includes(searchText);
        const matchBrand = brands.length === 0 || brands.includes(item.brand);
        const matchCond = conditionValue === 'all' || item.type === conditionValue;
        const matchMem = memories.length === 0 || (item.memory && memories.includes(item.memory));
        const matchCol = colors.length === 0 || (item.color && colors.includes(item.color));
        const price = parseFloat(item.price);
        const matchPrice = price >= minPrice && price <= maxPrice;

        return matchSearch && matchBrand && matchCond && matchMem && matchCol && matchPrice;
    });
    renderProducts(filtered);
}

// === ЗАПУСК ===
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    updateCartCounter(); // <--- Оновити лічильник при старті
        
        // Слухаємо відкриття модалки кошика, щоб перемалювати вміст
        const cartModalEl = document.getElementById('cartModal');
        if (cartModalEl) {
            cartModalEl.addEventListener('show.bs.modal', renderCartModal);
        }
    // Слухачі подій (з перевіркою на існування елементів)
    const addListener = (id, event, func) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(event, func);
    };

    addListener('search-btn', 'click', applyFilters);
    addListener('search-input', 'input', applyFilters);
    addListener('apply-filters', 'click', applyFilters);
    addListener('condition-filter', 'change', applyFilters);
    addListener('price-min', 'input', applyFilters);
    addListener('price-max', 'input', applyFilters);

    document.querySelectorAll('.filter-brand, .filter-memory').forEach(cb => cb.addEventListener('change', applyFilters));

    addListener('reset-filters', 'click', () => {
        document.querySelectorAll('input[type=checkbox]').forEach(cb => {
            cb.checked = false;
            const icon = document.querySelector(`label[for="${cb.id}"] .check-icon`);
            if(icon) icon.classList.add('d-none');
        });
        document.getElementById('search-input').value = '';
        document.getElementById('condition-filter').value = 'all';
        document.getElementById('price-min').value = '';
        document.getElementById('price-max').value = '';
        applyFilters();
    });
});