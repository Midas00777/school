// 1. ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ==========================================
let allRooms = [];
let currentFloor = 1;
let aboba = 100;

// ==========================================
// 2. УПРАВЛЕНИЕ СЕКЦИЯМИ И ВРЕМЕНЕМ
// ==========================================

function openSection(sectionId, clickedButton) {
    const sections = document.querySelectorAll('.content-section');
    const buttons = document.querySelectorAll('.nav-btn');
    const targetSection = document.getElementById(sectionId);
    
    if (!targetSection) return;

    // Скрываем все секции и деактивируем кнопки меню
    sections.forEach(s => s.classList.remove('active'));
    buttons.forEach(b => b.classList.remove('active'));

    // Показываем нужную
    targetSection.classList.add('active');

    // Подсвечиваем кнопку в нижнем меню
    if (clickedButton) {
        clickedButton.classList.add('active');
    } else {
        const btn = document.querySelector(`.nav-btn[onclick*="${sectionId}"]`);
        if (btn) btn.classList.add('active');
    }

    // Дополнительная загрузка данных при открытии секций
    if (sectionId === 'news') loadNews();
    if (sectionId === 'canteen') loadCanteen();
    if (sectionId === 'schedule') loadSchedule();
    if (sectionId === 'info') loadInfo();
}
// 2. ЧАСЫ
function updateDateTime() {
    const clock = document.getElementById('clock');
    const dateEl = document.getElementById('date');
    if (!clock || !dateEl) return;
    
    const now = new Date();
    clock.textContent = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    dateEl.textContent = now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' });
}

// ==========================================
// 3. НАВИГАЦИЯ И КАРТЫ
// ==========================================

async function loadFloor(floorNum, btn) {
    // 1. Подсветка кнопки
    document.querySelectorAll('.floor-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    // 2. Загрузка карты
    const container = document.getElementById('svg-map-container');
    if (container) {
        try {
            const response = await fetch(`${floorNum}Этаж.svg?v=${Date.now()}`);
            if (response.ok) {
                container.innerHTML = await response.text();
            } else {
                container.innerHTML = `<div class="map-error">Карта ${floorNum} этажа не загружена</div>`;
            }
        } catch (e) {
            container.innerHTML = `<div class="map-error">Ошибка связи с сервером</div>`;
        }
    }

    // 3. Обновляем список кабинетов под этот этаж
    filterRoomsByFloor(floorNum);
}

// ==========================================
// 4. ЗАГРУЗКА ДАННЫХ (НОВОСТИ, СТОЛОВАЯ, РАСПИСАНИЕ)
// ==========================================
async function loadNews() {
    const container = document.getElementById('news-container');
    if (!container) return;
    try {
        // Добавляем v=Date.now() чтобы браузер не кешировал старые новости
        const response = await fetch('news.json?v=' + Date.now());
        const news = await response.json();
        
        container.innerHTML = news.map((item, index) => `
            <div class="news-card" onclick="openNewsModal(${index})">
                <div class="news-media-container" style="width: 100%; height: 200px; overflow: hidden; border-radius: 12px 12px 0 0; background: #eee;">
                    ${item.type === 'video' 
                        ? `<video src="${item.file}" class="news-img" style="width: 100%; height: 100%; object-fit: cover;"></video>`
                        : `<img src="${item.file}" class="news-img" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://placehold.co/600x400?text=Нет+фото'">`}
                </div>
                <div class="news-content">
                    <span class="news-date">${item.date}</span>
                    <h3>${item.title}</h3>
                    <p>${item.text.substring(0, 100)}${item.text.length > 100 ? '...' : ''}</p> 
                </div>
            </div>
        `).join('');

        // Сохраняем новости в глобальную переменную для модального окна
        window.currentNews = news; 
    } catch (e) {
        console.error("Ошибка загрузки новостей:", e);
        container.innerHTML = '<p>Ошибка при загрузке новостей. Проверьте news.json</p>';
    }
}

function openNewsModal(index) {
    const newsItem = window.currentNews[index];
    const modal = document.getElementById('news-modal');
    const body = document.getElementById('modal-body');

    const mediaHtml = newsItem.type === 'video' 
        ? `<video src="${newsItem.file}" controls autoplay class="modal-full-img"></video>`
        : `<img src="${newsItem.file}" class="modal-full-img">`;

    body.innerHTML = `
        ${mediaHtml}
        <span class="news-date">${newsItem.date}</span>
        <h2 style="margin: 15px 0">${newsItem.title}</h2>
        <div class="modal-body-text">${newsItem.text}</div>
    `;

    modal.style.display = 'flex';
}

function closeNewsModal() {
    const modal = document.getElementById('news-modal');
    modal.style.display = 'none';
    // Остановка видео при закрытии
    const video = modal.querySelector('video');
    if (video) video.pause();
}

async function loadCanteen() {
    const container = document.getElementById('canteen-container');
    if (!container) return;

    try {
        const response = await fetch('canteen.json?v=' + Date.now());
        const categories = await response.json();

        container.innerHTML = categories.map(cat => `
            <div class="menu-section">
                <h2 class="category-title">${cat.category}</h2>
                <div class="canteen-grid">
                    ${cat.items.map(item => `
                        <div class="menu-card">
                            <div class="menu-header">
                                <span class="menu-icon">${item.icon || '🍽️'}</span>
                                <span class="menu-price">${item.price} ₽</span>
                            </div>
                            <div class="menu-info">
                                <h3>${item.name} <small style="color:var(--text-muted)">${item.weight || ''}</small></h3>
                                <div class="nutrients">
                                    <span>Б: ${item.prot || 0}</span>
                                    <span>Ж: ${item.fat || 0}</span>
                                    <span>У: ${item.carb || 0}</span>
                                    <strong>${item.kcal || 0} ккал</strong>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = '<p>Меню временно недоступно</p>';
    }
}

async function loadSchedule() {
    const container = document.getElementById('schedule-container');
    if (!container) return;

    // Заглушка данных. Позже можно сделать fetch('schedule.json')
    const scheduleData = [
        { time: "08:00 - 08:45", subject: "Математика", room: "101", teacher: "Иванов И.И." },
        { time: "08:55 - 09:40", subject: "Русский язык", room: "204", teacher: "Петрова А.В." },
        { time: "09:50 - 10:35", subject: "Информатика", room: "302", teacher: "Сидоров К.П." }
    ];

    container.innerHTML = `
        <table class="schedule-table">
            <thead>
                <tr><th>Время</th><th>Предмет</th><th>Каб.</th><th>Учитель</th></tr>
            </thead>
            <tbody>
                ${scheduleData.map(row => `
                    <tr><td>${row.time}</td><td><strong>${row.subject}</strong></td><td>${row.room}</td><td>${row.teacher}</td></tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// ==========================================
// 5. ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    updateDateTime();
    setInterval(updateDateTime, 1000); // Это оставляем, это только для часов
    
    // Загружаем данные только ОДИН РАЗ при открытии страницы
    loadNews();
    loadFloor(1); 
    
    // Если у тебя есть функция переключения вкладок (Инфо, Столовая), 
    // вызывай загрузку данных именно в момент клика на вкладку.
});    // Режим "Киоск": возврат на главную через 2 минуты бездействия
    let idleTime = 0;
    document.addEventListener('click', () => idleTime = 0);
    setInterval(() => {
        idleTime++;
        if (idleTime >= 120) {
            openSection('news');
            idleTime = 0;
        }
    }, 1000);
function filterRoomsByFloor(floorNum) {
    currentFloor = floorNum;
    const filtered = allRooms.filter(room => parseInt(room.floor) === floorNum);
    renderRooms(filtered);
}
// Загрузка списка кабинетов
// Загрузка списка кабинетов из JSON
async function loadRooms() {
    try {
        const response = await fetch('rooms.json?v=' + Date.now());
        if (!response.ok) return;
        allRooms = await response.json();
        // После загрузки данных отображаем 1 этаж
        filterRoomsByFloor(1);
    } catch (e) {
        console.error("Ошибка загрузки комнат:", e);
    }
}

// Отрисовка карточек кабинетов в колонке поиска
// Пример функции отрисовки (подправь под свою)
function renderRooms(rooms) {
    // В твоем HTML этот блок называется 'nav-content'
    const container = document.getElementById('nav-content'); 
    
    if (!container) return;

    container.innerHTML = rooms.map(room => `
        <div class="room-item">
            <span class="room-item-number">${room.id}</span>
            <div class="room-info">
                <div class="room-name">${room.name}</div>
                <div class="room-teacher">${room.teacher}</div>
            </div>
        </div>
    `).join('');
}

// Фильтрация (вызывается при вводе в поиск)
function filterRooms(query) {
    const lowQuery = query.toLowerCase();
    
    // Ищем среди ВСЕХ комнат, если человек ввел поиск
    const filtered = allRooms.filter(room => 
        room.id.toLowerCase().includes(lowQuery) || 
        room.name.toLowerCase().includes(lowQuery) || 
        room.teacher.toLowerCase().includes(lowQuery)
    );
    
    renderRooms(filtered);
}

// Функция для подсветки кабинета на SVG
function highlightRoom(roomId) {
    // 1. Находим все кабинеты на SVG (предположим, у них id="room-101")
    const svg = document.querySelector('#svg-map-container svg');
    if (!svg) return;

    // Сбрасываем старую подсветку
    svg.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));

    // Ищем элемент с нужным ID
    const roomElement = svg.getElementById(`room-${roomId}`) || svg.getElementById(roomId);
    
    if (roomElement) {
        roomElement.classList.add('highlight');
        roomElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}
document.addEventListener('DOMContentLoaded', () => {
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    loadNews();
    loadRooms(); // <-- ДОБАВЬ ЭТУ СТРОКУ
    loadFloor(1); // Загружаем 1 этаж при старте
});
async function loadDataList(type) {
    // Исправляем определение контейнера
    const containerId = 'list-' + (type === 'news' ? 'news' : type === 'room' ? 'rooms' : type === 'canteen' ? 'canteen' : type);
    const container = document.getElementById(containerId);
    const files = { news: 'news.json', room: 'rooms.json', canteen: 'canteen.json', info: 'info.json', schedule: 'schedule.json' };
    
    if (!container) return;

    try {
        const res = await fetch(files[type] + '?v=' + Date.now());
        const data = await res.json();
        container.innerHTML = '<h4>Текущие данные:</h4>';

        if (type === 'canteen') {
            // Особенная отрисовка для столовой, так как там вложенные массивы
            data.forEach((catGroup, catIndex) => {
                catGroup.items.forEach((item, itemIndex) => {
                    container.innerHTML += `
                        <div class="list-item">
                            <span>[${catGroup.category}] ${item.name}</span>
                            <div class="actions">
                                <button class="del-btn" onclick="deleteCanteenItem(${catIndex}, ${itemIndex})">
                                    <span class="material-icons-round">delete</span>
                                </button>
                            </div>
                        </div>`;
                });
            });
        } else {
            // Стандартная отрисовка для остальных
            data.forEach((item, index) => {
                container.innerHTML += `
                    <div class="list-item">
                        <span>${item.title || item.name || item.room_id || item.subject}</span>
                        <div class="actions">
                            <button class="del-btn" onclick="deleteItem('${type}', ${index})">
                                <span class="material-icons-round">delete</span>
                            </button>
                        </div>
                    </div>`;
            });
        }
    } catch (e) { container.innerHTML = '<p>Данных пока нет</p>'; }
}
async function loadInfo() {
    const container = document.getElementById('info-container');
    if (!container) return;

    try {
        const response = await fetch('info.json?v=' + Date.now());
        const data = await response.json();

        // Вместо старого мапа вызываем новую правильную функцию отрисовки
        renderInfoBlocks(data);
        
    } catch (e) {
        console.error("Ошибка загрузки инфо:", e);
        container.innerHTML = '<p>Информация обновляется...</p>';
    }
}
// Функция для отрисовки блоков (вызывай её при загрузке данных инфо)
// 1. Функция отрисовки (вызывается после получения данных из админки)
function renderInfoBlocks(infoData) {
    const container = document.getElementById('info-container');
    if (!container) return;

    container.innerHTML = infoData.map(item => `
        <div class="info-card">
            <h3 style="
                white-space: normal !important; 
                overflow: visible !important; 
                text-overflow: clip !important; 
                display: block !important; 
                height: auto !important; 
                min-height: min-content !important;
                text-align: center;
            ">
                <span class="material-icons-round" style="display: block; margin-bottom: 8px;">info</span> 
                ${item.title}
            </h3>
            <div class="info-card-content">
                <p>${item.text}</p>
            </div>
            <button class="info-more-btn" 
                    data-title="${item.title.replace(/"/g, '&quot;')}" 
                    data-text="${item.text.replace(/"/g, '&quot;')}">
                Подробнее
            </button>
        </div>
    `).join('');
}

// 2. Глобальный обработчик клика (добавь это ОДИН РАЗ в начало или конец logic.js)
document.addEventListener('click', function(event) {
    // Ищем кнопку, даже если кликнули по иконке внутри неё
    const btn = event.target.closest('.info-more-btn');
    
    if (btn) {
        const title = btn.getAttribute('data-title');
        const text = btn.getAttribute('data-text');
        showFullInfoModal(title, text);
    }
});

// 3. Функция показа модалки
function showFullInfoModal(title, text) {
    const modal = document.getElementById('news-modal'); // Используем твою существующую модалку
    const modalBody = document.getElementById('modal-body');

    if (modal && modalBody) {
        modalBody.innerHTML = `
            <h2 style="color: var(--primary); margin-bottom: 15px;">${title}</h2>
            <div style="font-size: 18px; line-height: 1.6; white-space: pre-wrap;">${text}</div>
        `;
        modal.style.display = 'flex';
    } else {
        console.error("Ошибка: Модальное окно или его тело не найдены!");
    }
}

// Функция открытия модалки (используем твой news-modal)
function openFullInfo(title, text) {
    const modal = document.getElementById('news-modal');
    const modalBody = document.getElementById('modal-body');
    
    if (!modal || !modalBody) {
        console.error("Модальное окно не найдено в HTML!");
        return;
    }

    modalBody.innerHTML = `
        <h2 style="margin-bottom: 20px; color: var(--primary); font-size: 28px;">${title}</h2>
        <div style="font-size: 18px; line-height: 1.6; color: var(--text-main); white-space: pre-wrap;">
            ${text}
        </div>
    `;
    
    // Показываем окно
    modal.style.display = 'flex';
}
function closeNewsModal() {
    const modal = document.getElementById('news-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}