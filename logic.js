// 1. ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ==========================================
let allRooms = [];
let currentFloor = 1;
let currentMapType = 'regular';
let scale = 1;
let evCache = []; 
let prevDiff = -1; 
let currentPos = { x: 0, y: 0 };
let startPos = { x: 0, y: 0 };
let isDragging = false; // Не забудь добавить эту строку, она важна

// ==========================================
// 2. УПРАВЛЕНИЕ СЕКЦИЯМИ И ВРЕМЕНЕМ
// ==========================================
// --- ЛОГИКА СЛАЙДЕРА ---
let currentSlide = 0;

function naturalSort(a, b) {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function sortClasses(a, b) {
    // Извлекаем только цифры из названия класса (например, "11Б" -> 11)
    const numA = parseInt(a);
    const numB = parseInt(b);

    if (numA !== numB) {
        return numA - numB; // Сначала младшие, потом старшие
    }
    // Если цифры одинаковые (например, 5А и 5Б), сортируем по букве
    return a.localeCompare(b);
}

// ПРИМЕР: Там, где ты генерируешь кнопки классов
function renderClassButtons(data) {
    const container = document.getElementById('class-buttons-container');
    container.innerHTML = '';

    // Берем все ключи (названия классов), сортируем их и только потом рисуем
    const sortedClasses = Object.keys(data).sort(sortClasses);

    sortedClasses.forEach(className => {
        const btn = document.createElement('button');
        btn.className = 'class-btn';
        btn.innerText = className;
        btn.onclick = () => showScheduleForClass(className);
        container.appendChild(btn);
    });
}

function moveSlide(direction) {
    const track = document.getElementById('sliderTrack');
    const slides = track.querySelectorAll('img');
    const dots = document.querySelectorAll('.dot');
    
    if (!track || slides.length === 0) return;

    currentSlide = (currentSlide + direction + slides.length) % slides.length;
    track.style.transform = `translateX(-${currentSlide * 100}%)`;
    
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentSlide);
    });
}

function setSlide(index) {
    currentSlide = index;
    moveSlide(0);
}

// Вспомогательная функция для генерации HTML слайдера

function openSection(sectionId, clickedButton) {
    document.body.style.overflow = 'auto';

    // 2. Если есть открытые модалки — закрываем их (на всякий случай)
    const modal = document.getElementById('news-modal');
    if (modal) modal.style.display = 'none';
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
    if (sectionId === 'navigation') loadRooms(); 
    
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



function setMapType(type, btn) {
    currentMapType = type;
    
    // Подсветка кнопок режима
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    
    // Перезагружаем текущий этаж с новым типом
    loadFloor(currentFloor);
}

async function loadFloor(floorNum, btn) {
    currentFloor = floorNum; // Обновляем глобальную переменную
    
    // 1. Подсветка кнопок этажей
    document.querySelectorAll('.floor-btn').forEach(b => b.classList.remove('active'));
    if (btn) {
        btn.classList.add('active');
    } else {
        // Если кнопка не передана (вызов из setMapType), ищем её в DOM
        const floorBtns = document.querySelectorAll('.floor-btn');
        if (floorBtns[floorNum - 1]) floorBtns[floorNum - 1].classList.add('active');
    }

    const container = document.getElementById('svg-map-container');
    if (!container) return;

    container.innerHTML = '<div class="loading">Загрузка...</div>';

    try {
        let filePath;
        if (currentMapType === 'evacuation') {
            filePath = `img/${floorNum}evoFloor.png?v=${Date.now()}`;
        } else {
            filePath = `img/${floorNum}Этаж.svg?v=${Date.now()}`;
        }

        const response = await fetch(filePath);
        
        if (response.ok) {
            if (filePath.endsWith('.svg')) {
                container.innerHTML = await response.text();
            } else {
                container.innerHTML = `<img src="${filePath}" style="width: 100%; height: auto; border-radius: 12px; display: block;">`;
            }
        } else {
            // Если SVG не найден для обычной карты, пробуем PNG
            if (currentMapType === 'regular') {
                const pngPath = `img/${floorNum}Этаж.png?v=${Date.now()}`;
                container.innerHTML = `<img src="${pngPath}" style="width: 100%; height: auto; border-radius: 12px; display: block;" onerror="this.parentElement.innerHTML='Карта не найдена'">`;
            } else {
                container.innerHTML = '<div class="map-error">План эвакуации не найден</div>';
            }
        }
    } catch (e) {
        container.innerHTML = '<div class="map-error">Ошибка связи с сервером</div>';
    }

    // Обновляем список кабинетов под этот этаж
    if (currentMapType === 'regular') {
        filterRoomsByFloor(floorNum);
    }
}
// ==========================================
// 4. ЗАГРУЗКА ДАННЫХ (НОВОСТИ, СТОЛОВАЯ, РАСПИСАНИЕ)
// ==========================================
// --- 1. ЗАГРУЗКА НОВОСТЕЙ (Универсальная) ---
async function loadNews() {
    const container = document.getElementById('news-container');
    if (!container) return;

    try {
        const response = await fetch('news.json?v=' + Date.now());
        const news = await response.json();
        
        container.innerHTML = news.map((item, index) => {
            // Ищем картинку в разных полях (file, files или images)
            let previewImg = '';
            if (item.images && item.images.length > 0) previewImg = item.images[0];
            else if (item.files && item.files.length > 0) previewImg = item.files[0];
            else if (item.file) previewImg = item.file;

            // Если путь пустой или это .txt — ставим заглушку
            if (!previewImg || typeof previewImg !== 'string' || previewImg.endsWith('.txt')) {
                previewImg = 'https://placehold.co/600x400?text=Нет+фото';
            }

            return `
                <div class="news-card" onclick="openNewsModal(${index})">
                    <div class="news-media-container" style="width: 100%; height: 200px; overflow: hidden; background: #eee;">
                        <img src="${previewImg}" style="width: 100%; height: 100%; object-fit: cover;" 
                             onerror="this.src='https://placehold.co/600x400?text=Ошибка+пути'">
                    </div>
                    <div class="news-content">
                        <span class="news-date">${item.date || ''}</span>
                        <h3>${item.title || 'Новость'}</h3>
                        <p>${item.text ? item.text.substring(0, 80) + '...' : ''}</p> 
                    </div>
                </div>`;
        }).join('');

        window.currentNews = news; 
    } catch (e) {
        console.error("Ошибка загрузки новостей:", e);
    }
}

// --- 2. ОТКРЫТИЕ МОДАЛКИ (с блокировкой скролла) ---
function openNewsModal(index) {
    const newsItem = window.currentNews[index];
    const modal = document.getElementById('news-modal');
    const body = document.getElementById('modal-body');
    const viewport = document.querySelector('.content-viewport'); // Твой реальный контейнер со скроллом

    if (!modal || !newsItem) return;

    let allImages = [];
    if (newsItem.images) allImages = newsItem.images;
    else if (newsItem.files) allImages = newsItem.files;
    else if (newsItem.file) allImages = [newsItem.file];

    body.innerHTML = `
        ${createSliderHtml(allImages)}
        <div style="padding: 20px;">
            <span class="news-date">${newsItem.date || ''}</span>
            <h2 style="margin: 15px 0; color: var(--primary);">${newsItem.title || ''}</h2>
            <div style="font-size: 18px; line-height: 1.6; white-space: pre-wrap;">${newsItem.text || ''}</div>
        </div>
    `;

    modal.style.display = 'flex';
    
    // БЛОКИРУЕМ СКРОЛЛ В КОНТЕЙНЕРЕ
    if (viewport) {
        viewport.style.overflow = 'hidden';
    }
}

function closeNewsModal() {
    const modal = document.getElementById('news-modal');
    const viewport = document.querySelector('.content-viewport');

    if (modal) {
        modal.style.display = 'none';
    }
    
    // ВОЗВРАЩАЕМ СКРОЛЛ В КОНТЕЙНЕР
    if (viewport) {
        viewport.style.overflow = 'auto';
    }
}

// --- 4. СОЗДАНИЕ СЛАЙДЕРА (с ограничением высоты) ---
function createSliderHtml(images) {
    const imgsArray = (Array.isArray(images) ? images : [images])
                      .filter(img => typeof img === 'string' && !img.endsWith('.txt'));
    
    if (imgsArray.length === 0) {
        return '<img src="https://placehold.co/600x400?text=Нет+фото" style="width:100%; max-height:60vh; object-fit:contain;">';
    }

    const slides = imgsArray.map(src => `
        <div style="min-width: 100%; display: flex; justify-content: center; background: #000;">
            <img src="${src}" style="max-width: 100%; max-height: 60vh; object-fit: contain;">
        </div>
    `).join('');

    if (imgsArray.length === 1) return `<div style="background:#000;">${slides}</div>`;

    return `
        <div class="news-slider" style="position:relative; overflow:hidden; background:#000;">
            <div class="slider-track" id="sliderTrack" style="display:flex; transition: 0.3s;">${slides}</div>
            <button onclick="event.stopPropagation(); moveSlide(-1)" class="slider-btn" style="position:absolute; left:10px; top:50%; transform:translateY(-50%);">❮</button>
            <button onclick="event.stopPropagation(); moveSlide(1)" class="slider-btn" style="position:absolute; right:10px; top:50%; transform:translateY(-50%);">❯</button>
        </div>
    `;
}

async function loadCanteen() {
    const container = document.getElementById('canteen-container');
    if (!container) return;

    try {
        const response = await fetch('canteen.json?v=' + Date.now());
        const categories = await response.json();

        // Добавляем красивый заголовок перед основным контентом
        let html = `
            <div class="custom-section-header">
                <div class="icon-box bg-canteen">
                    <span class="material-icons-round">restaurant</span>
                </div>
                <h2>Буфет</h2>
            </div>
        `;

        html += categories.map(cat => `
            <div class="menu-section">
                <h2 class="category-title">${cat.category}</h2>
                <div class="canteen-grid">
                    ${cat.items.map(item => `
                        <div class="menu-card">
                            </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
        
        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = '<p>Меню временно недоступно</p>';
    }
}

// async function loadSchedule() {
//     const container = document.getElementById('schedule-container');
//     if (!container) return;

//     // Заглушка данных. Позже можно сделать fetch('schedule.json')
//     const scheduleData = [
//         { time: "08:00 - 08:45", subject: "Математика", room: "101", teacher: "Иванов И.И." },
//         { time: "08:55 - 09:40", subject: "Русский язык", room: "204", teacher: "Петрова А.В." },
//         { time: "09:50 - 10:35", subject: "Информатика", room: "302", teacher: "Сидоров К.П." }
//     ];

//     container.innerHTML = `
//         <table class="schedule-table">
//             <thead>
//                 <tr><th>Время</th><th>Предмет</th><th>Каб.</th><th>Учитель</th></tr>
//             </thead>
//             <tbody>
//                 ${scheduleData.map(row => `
//                     <tr><td>${row.time}</td><td><strong>${row.subject}</strong></td><td>${row.room}</td><td>${row.teacher}</td></tr>
//                 `).join('')}
//             </tbody>
//         </table>
//     `;
// }

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
        const rooms = await response.json();
        
        if (!rooms || !Array.isArray(rooms)) {
            console.error("Файл rooms.json пуст или имеет неверный формат");
            return;
        }

        allRooms = rooms; // Обновляем глобальную переменную для поиска на карте
        renderRooms(rooms); // Рисуем список в навигации
        
        console.log("Кабинеты успешно загружены:", rooms);
    } catch (e) {
        console.error("Ошибка при загрузке кабинетов:", e);
    }
}

// Отрисовка карточек кабинетов в колонке поиска
// Пример функции отрисовки (подправь под свою)
function renderRooms(rooms) {
    const container = document.getElementById('nav-content'); 
    if (!container) return;

    if (rooms.length === 0) {
        container.innerHTML = '<div style="padding:20px; color:gray;">Кабинеты не найдены</div>';
        return;
    }

    container.innerHTML = rooms.map(room => `
        <div class="room-item" onclick="highlightRoom('${room.id}')" style="cursor:pointer;">
            <span class="room-item-number">${room.id || '—'}</span>
            <div class="room-info">
                <div class="room-name">${room.name || 'Без названия'}</div>
                <div class="room-teacher" style="font-size: 0.9em; color: var(--text-muted);">
                    ${room.teacher || 'Педагог не указан'}
                </div>
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
    try {
        const res = await fetch('info.json?v=' + Date.now());
        const data = await res.json();
        renderInfo(data); // <--- Используем правильное имя функции
    } catch (e) {
        console.error("Ошибка загрузки инфо:", e);
    }
}
// Функция для отрисовки блоков (вызывай её при загрузке данных инфо)
// 1. Функция отрисовки (вызывается после получения данных из админки)
// Функция отрисовки карточек
// Функция отрисовки карточек Инфо
function renderInfo(data) {
    const container = document.getElementById('info-container');
    if (!container) return;
    container.innerHTML = '';

    data.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'info-card';
        
        // Берем первое фото из массива images
        const firstImg = (item.images && item.images.length > 0) ? item.images[0] : 'img/default-info.png';

        card.innerHTML = `
            <img src="${firstImg}" alt="">
            <div class="info-card-content">
                <h3>${item.title || ""}</h3>
                <p>${(item.text || "").substring(0, 100)}...</p>
                <button class="read-more" onclick="showFullInfo(${index})">
                    <span class="material-icons-round">visibility</span>
                    Подробнее
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

// Функция открытия модального окна для Инфо (Универсальная)
async function showFullInfo(index) {
    try {
        const res = await fetch('info.json?v=' + Date.now());
        const data = await res.json();
        const item = data[index];

        if (!item) return;

        const modal = document.getElementById('news-modal');
        const modalBody = document.getElementById('modal-body');
        const viewport = document.querySelector('.content-viewport'); // Добавляем поиск вьюпорта
        
        currentSlide = 0;

        let imagesHtml = '';
        if (item.images && item.images.length > 0) {
            imagesHtml = `
                <div class="modal-slider">
                    <div class="slider-track" id="sliderTrack">
                        ${item.images.map(img => `<img src="${img}" alt="">`).join('')}
                    </div>
                    ${item.images.length > 1 ? `
                        <button class="slider-btn prev" onclick="moveSlide(-1)" aria-label="Назад">&#10094;</button>
                        <button class="slider-btn next" onclick="moveSlide(1)" aria-label="Вперед">&#10095;</button>
                        <div class="slider-dots">
                            ${item.images.map((_, i) => `<span class="dot ${i === 0 ? 'active' : ''}" onclick="setSlide(${i})"></span>`).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        }

        modalBody.innerHTML = `
            ${imagesHtml}
            <div class="modal-text-content">
                <div class="modal-date">${item.date || ''}</div>
                <h2>${item.title || ""}</h2>
                <div class="full-text">${item.text || ""}</div>
            </div>
        `;

        modal.style.display = 'block';

        // --- ФИКСЫ СКРОЛЛА ---
        if (viewport) {
            viewport.style.overflow = 'hidden'; // Блокируем основной скролл
        }
        
        // Сбрасываем скролл самой модалки в самый верх (убирает баги отображения)
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.scrollTop = 0;
        }

        if (item.images && item.images.length > 1) {
            updateSliderDisplay(); 
        }

    } catch (e) {
        console.error("Ошибка открытия инфо:", e);
    }
}

function openFullInfo(title, text, images) {
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        ${createSliderHtml(images)}
        <div style="padding:20px;">
            <h2 style="color:var(--primary)">${title}</h2>
            <p style="white-space:pre-wrap; font-size:18px;">${text}</p>
        </div>`;
    document.getElementById('news-modal').style.display = 'flex';
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
function showFullInfoModal(title, text, images) {
    const modal = document.getElementById('news-modal');
    const modalBody = document.getElementById('modal-body');

    if (modal && modalBody) {
        currentSlide = 0; // Сбрасываем слайдер на начало

        modalBody.innerHTML = `
            <div style="padding: 20px;">
                ${createSliderHtml(images)}
                <h2 style="color: var(--primary); margin: 20px 0 15px;">${title}</h2>
                <div style="font-size: 18px; line-height: 1.6; white-space: pre-wrap;">${text}</div>
            </div>
        `;
        modal.style.display = 'flex';
    }
}

// Функция открытия модалки (используем твой news-modal)
function openFullInfo(title, text, images) {
    const modalBody = document.getElementById('modal-body');
    currentSlide = 0; // Сброс слайдера
    
    modalBody.innerHTML = `
        <h2 style="margin-bottom: 20px; color: var(--primary);">${title}</h2>
        ${createSlider(images)}
        <div style="font-size: 18px; line-height: 1.6; white-space: pre-wrap;">${text}</div>
    `;
    document.getElementById('news-modal').style.display = 'flex';
}
function closeNewsModal() {
    const modal = document.getElementById('news-modal');
    const viewport = document.querySelector('.content-viewport');

    if (modal) {
        modal.style.display = 'none';
    }
    
    // Возвращаем скролл основному контенту
    if (viewport) {
        viewport.style.overflow = 'auto';
    }
}
let fullSchedule = null; // Здесь будем хранить весь JSON

async function loadScheduleData() {
    try {
        // Убираем 'data/' перед названием файла
        const response = await fetch('schedule.json?v=' + Date.now()); 
        fullSchedule = await response.json();
        console.log("Расписание успешно загружено:", fullSchedule); // Добавь для проверки
    } catch (e) {
        console.error("Ошибка загрузки расписания:", e);
    }
}
// Функция выбора смены
async function loadShift(shiftKey, btn) {
    document.querySelectorAll('.shift-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    if (!fullSchedule) await loadScheduleData();

    const classListDiv = document.getElementById('class-list');
    const container = document.getElementById('schedule-container');
    
    classListDiv.innerHTML = ''; 
    container.innerHTML = '<div style="text-align: center; color: #64748b; padding: 40px;">Выберите класс</div>';

    if (!fullSchedule || !fullSchedule[shiftKey]) return;

    // --- ВОТ ТУТ МАГИЯ ПОРЯДКА ДНЕЙ ---
    const daysOrder = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница"];
    
    // Получаем список классов (например, "5А", "6Б")
    // Используем твою функцию naturalSort для правильного порядка (5, 10, 11)
const classes = Object.keys(fullSchedule[shiftKey]).sort(naturalSort);
    
    classes.forEach(className => {
        const classBtn = document.createElement('button');
        classBtn.className = 'class-btn';
        classBtn.innerText = className.toUpperCase();
        classBtn.onclick = () => showClassSchedule(shiftKey, className, classBtn);
        classListDiv.appendChild(classBtn);
    });
}
// Функция отрисовки таблицы
function showClassSchedule(shiftKey, className, btn) {
    // 1. Подсвечиваем выбранный класс
    document.querySelectorAll('.class-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    const container = document.getElementById('schedule-container');
    const data = fullSchedule[shiftKey][className];
    
    if (!data) {
        container.innerHTML = '<div style="padding:20px;">Расписание не заполнено</div>';
        return;
    }

    // --- ПРИНУДИТЕЛЬНЫЙ ПОРЯДОК ДНЕЙ ---
    const daysOrder = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница"];
    let html = '';

    // Перебираем строго по нашему списку
    daysOrder.forEach(dayName => {
        // Ищем данные дня (проверяем все варианты написания)
        const dayData = data[dayName] || data[dayName.toLowerCase()] || data[dayName.toUpperCase()];
        
        if (dayData) {
            // Найди этот кусок внутри функции showClassSchedule в logic.js
// И замени формирование thead и tbody на этот:

html += `
    <div class="day-block" style="margin-bottom: 25px;">
        <h3 style="color: #2563eb; margin-bottom: 10px; padding-left: 5px; text-transform: uppercase;">${dayName}</h3>
        <table class="schedule-table" style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.05); table-layout: auto;">
            <thead style="background: #f1f5f9;">
                <tr>
                    <th style="padding: 12px; border: 1px solid #e2e8f0; width: 40px;">№</th>
                    <th style="padding: 12px; border: 1px solid #e2e8f0; width: 150px; white-space: nowrap;">Время</th>
                    <th style="padding: 12px; border: 1px solid #e2e8f0;">Предмет</th>
                    <th style="padding: 12px; border: 1px solid #e2e8f0; width: 70px;">Каб.</th>
                </tr>
            </thead>
            <tbody>
                ${dayData.map(lesson => `
                    <tr>
                        <td style="padding: 12px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold;">${lesson.num || ''}</td>
                        <td style="padding: 12px; border: 1px solid #e2e8f0; text-align: center; white-space: nowrap;">${lesson.time || ''}</td>
                        <td style="padding: 12px; border: 1px solid #e2e8f0;">${lesson.name || lesson.subject}</td>
                        <td style="padding: 12px; border: 1px solid #e2e8f0; text-align: center; color: #2563eb; font-weight: bold;">${lesson.room || ''}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
`;
        }
    });

    container.innerHTML = html;
}   
// Автоматическая загрузка первой смены при открытии раздела
function loadSchedule() {
    const firstShiftBtn = document.querySelector('.shift-selector .tab-btn');
    if (firstShiftBtn) loadShift('1_smena', firstShiftBtn);
}
// Добавь это в самый низ logic.js
document.addEventListener('DOMContentLoaded', () => {
    loadScheduleData().then(() => {
        // После загрузки данных имитируем нажатие на первую кнопку
        const firstBtn = document.querySelector('.shift-btn');
        if (firstBtn) loadShift('1_smena', firstBtn);
    });
});


function setMapType(type, btn) {
    currentMapType = type;
    // Подсветка кнопок режима
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    
    // Перезагружаем текущий этаж с новым типом карты
    loadFloor(currentFloor); 
}

async function loadFloor(floorNum, btn) {
    currentFloor = floorNum; // Сохраняем текущий этаж
    
    // 1. Подсветка кнопки этажа
    if (btn) {
        document.querySelectorAll('.floor-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }

    const container = document.getElementById('svg-map-container');
    if (!container) return;

    container.innerHTML = '<div class="loading">Загрузка...</div>';

    try {
        let filePath;
        if (currentMapType === 'evacuation') {
            filePath = `img/${floorNum}evoFloor.png?v=${Date.now()}`;
        } else {
            filePath = `img/${floorNum}Этаж.svg?v=${Date.now()}`;
        }

        const response = await fetch(filePath);
        
        if (response.ok) {
            if (filePath.endsWith('.svg')) {
                container.innerHTML = await response.text();
            } else {
                container.innerHTML = `<img src="${filePath}" style="width: 100%; height: auto; border-radius: 12px; display: block;">`;
            }
            
            // ВЫЗОВ ЗУМА И СБРОСА (для SVG или первого PNG)
            setTimeout(() => {
                initTouchZoom();
                resetZoom();
            }, 100);

        } else if (currentMapType === 'regular') {
            const pngPath = `img/${floorNum}Этаж.png?v=${Date.now()}`;
            container.innerHTML = `<img src="${pngPath}" style="width: 100%; height: auto; border-radius: 12px; display: block;" onerror="this.parentElement.innerHTML='Карта не найдена'">`;
            
            // ВЫЗОВ ЗУМА И СБРОСА (для резервного PNG)
            setTimeout(() => {
                initTouchZoom();
                resetZoom();
            }, 100);
        } else {
            container.innerHTML = `<div class="map-error">План эвакуации не найден</div>`;
        }
    } catch (e) {
        container.innerHTML = `<div class="map-error">Ошибка связи с сервером</div>`;
    }

    if (currentMapType === 'regular') {
        filterRoomsByFloor(floorNum);
    }
}

// Функция для кнопок + и -
function changeScale(delta) {
    const img = document.querySelector('#svg-map-container img') || 
                document.querySelector('#svg-map-container svg');
    if (!img) return;

    // Изменяем масштаб в пределах от 1 до 4
    scale = Math.min(Math.max(1, scale + delta), 4);
    
    // Если возвращаемся к масштабу 1, центрируем карту
    if (scale === 1) {
        currentPos = { x: 0, y: 0 };
    }

    updateTransform(img);
}

// Функция сброса
function resetZoom() {
    const img = document.querySelector('#svg-map-container img') || 
                document.querySelector('#svg-map-container svg');
    if (!img) return;

    scale = 1;
    currentPos = { x: 0, y: 0 };
    updateTransform(img);
}

function initTouchZoom() {
    const el = document.getElementById('svg-map-container');
    if (!el) return;

    const img = el.querySelector('img') || el.querySelector('svg');
    if (!img) return;

    // Сброс при новой загрузке
    scale = 1;
    currentPos = { x: 0, y: 0 };
    img.style.transform = `translate(0px, 0px) scale(1)`;

    el.onpointerdown = (e) => {
        evCache.push(e);
        isDragging = true;
        startPos = { x: e.clientX - currentPos.x, y: e.clientY - currentPos.y };
    };

    el.onpointermove = (e) => {
        // Находим это касание в кэше и обновляем его координаты
        const index = evCache.findIndex((ev) => ev.pointerId === e.pointerId);
        evCache[index] = e;

        // Если касания два — это ЩИПОК (Zoom)
        if (evCache.length === 2) {
            const curDiff = Math.hypot(evCache[0].clientX - evCache[1].clientX, evCache[0].clientY - evCache[1].clientY);

            if (prevDiff > 0) {
                if (curDiff > prevDiff) scale += 0.05;
                if (curDiff < prevDiff) scale -= 0.05;
                scale = Math.min(Math.max(1, scale), 4); // Ограничение зума
            }
            prevDiff = curDiff;
        } 
        // Если касание одно — это ПЕРЕМЕЩЕНИЕ (Drag)
        else if (evCache.length === 1 && isDragging) {
            currentPos.x = e.clientX - startPos.x;
            currentPos.y = e.clientY - startPos.y;
        }
        
        updateTransform(img);
    };

    el.onpointerup = el.onpointerleave = (e) => {
        evCache = evCache.filter((ev) => ev.pointerId !== e.pointerId);
        if (evCache.length < 2) prevDiff = -1;
        if (evCache.length === 0) isDragging = false;
    };
}

function updateTransform(element) {
    element.style.transform = `translate(${currentPos.x}px, ${currentPos.y}px) scale(${scale})`;
}
async function editItem(type, index) {
    const files = { news: 'news.json', info: 'info.json', room: 'rooms.json' };
    const res = await fetch(files[type] + '?v=' + Date.now());
    const data = await res.json();
    const item = data[index];

    if (type === 'info') {
        const form = document.getElementById('infoForm');
        form.querySelector('[name="edit_index"]').value = index;
        form.querySelector('[name="title"]').value = item.title;
        form.querySelector('[name="text"]').value = item.text;
        document.getElementById('info_submit_btn').innerText = "Сохранить изменения";
    } else if (type === 'news') {
        const form = document.getElementById('newsForm');
        form.querySelector('[name="edit_index"]').value = index;
        form.querySelector('[name="title"]').value = item.title;
        form.querySelector('[name="text"]').value = item.text;
        form.querySelector('button[type="submit"]').innerText = "Сохранить новость";
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
function showCanteenMenu(type) {
    const selection = document.getElementById('canteen-selection');
    const viewer = document.getElementById('canteen-viewer');
    const displayArea = document.getElementById('menu-display-area');

    selection.style.display = 'none';
    viewer.style.display = 'block';

    // Укажите здесь пути к вашим файлам
    const menuFiles = {
        'regular': 'menus/main_menu.pdf', // Путь к PDF основного меню
        'diabetic': 'menus/diabetic_menu.pdf' // Путь к PDF для диабетиков
    };

    const fileUrl = menuFiles[type];
    
    // Проверка: если файл — картинка, выводим <img>, если PDF — <iframe>
    if (fileUrl.endsWith('.pdf')) {
        displayArea.innerHTML = `<iframe src="${fileUrl}#toolbar=0" frameborder="0"></iframe>`;
    } else {
        displayArea.innerHTML = `<img src="${fileUrl}" alt="Меню">`;
    }
}

function backToCanteenSelection() {
    document.getElementById('canteen-selection').style.display = 'grid';
    document.getElementById('canteen-viewer').style.display = 'none';
}