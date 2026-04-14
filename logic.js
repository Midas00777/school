// 1. ИНИЦИАЛИЗАЦИЯ
document.addEventListener('DOMContentLoaded', () => {
    updateDateTime();
    setInterval(updateDateTime, 1000);
    renderNavigation(); // Загрузка кабинетов
    renderNews();       // Загрузка новостей
});

// 2. ЧАСЫ
function updateDateTime() {
    const now = new Date();
    const clock = document.getElementById('clock');
    const dateEl = document.getElementById('date');
    
    if (clock) clock.textContent = now.toLocaleTimeString('ru-RU');
    if (dateEl) {
        const options = { day: 'numeric', month: 'long', weekday: 'long' };
        dateEl.textContent = now.toLocaleDateString('ru-RU', options);
    }
}

// 3. ПЕРЕКЛЮЧЕНИЕ СЕКЦИЙ
function openSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    document.getElementById(sectionId).classList.add('active');
    
    // Подсветка кнопки
    const btn = Array.from(document.querySelectorAll('.nav-btn'))
                     .find(b => b.getAttribute('onclick').includes(sectionId));
    if (btn) btn.classList.add('active');
}

// 4. НАВИГАЦИЯ (ДАННЫЕ И ОТРИСОВКА)
function renderNavigation(filter = '') {
    const container = document.getElementById('nav-content');
    if (!container) return;

    // Загружаем из localStorage или берем дефолт, если пусто
    const defaultRooms = [
        { id: '101', name: 'Математика', teacher: 'Иванова Т.А.' },
        { id: '102', name: 'Столовая', teacher: 'Смена №1' }
    ];
    const schoolRooms = JSON.parse(localStorage.getItem('schoolRooms')) || defaultRooms;

    const filtered = schoolRooms.filter(r => 
        r.id.toLowerCase().includes(filter.toLowerCase()) || 
        r.teacher.toLowerCase().includes(filter.toLowerCase()) ||
        r.name.toLowerCase().includes(filter.toLowerCase())
    );

    container.innerHTML = filtered.map(r => `
        <div class="room-card">
            <div class="room-num">${r.id}</div>
            <div class="room-info">
                <strong>${r.name}</strong>
                <p>${r.teacher}</p>
            </div>
        </div>
    `).join('');
}

function filterRooms(val) {
    renderNavigation(val);
}

// 5. НОВОСТИ (ЗАГЛУШКА)
function renderNews() {
    const container = document.getElementById('news-container');
    if (container) {
        container.innerHTML = '<p style="padding:20px">Новостей пока нет. Добавьте их в админ-панели.</p>';
    }
}