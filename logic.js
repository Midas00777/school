// ==========================================
// 1. ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ==========================================
let allRooms = [];

// ==========================================
// 2. ФУНКЦИИ ЗАГРУЗКИ ДАННЫХ (JSON)
// ==========================================

// Загрузка НОВОСТЕЙ
async function loadNews() {
    const container = document.getElementById('news-container');
    // Внутри loadNews, где создается карточка:
card.innerHTML = `
    ${mediaHtml}
    <div class="news-content">
        <span class="news-date">${item.date}</span>
        <h3>${item.title}</h3>
        <p>${item.text}</p>
    </div>`;
    if (!container) return;
    try {
        const response = await fetch('news.json?v=' + Date.now());
        if (!response.ok) return;
        const news = await response.json();
        container.innerHTML = '';
        news.forEach(item => {
            const card = document.createElement('div');
            card.className = 'news-card';
            const mediaHtml = item.type === 'video' 
                ? `<video src="${item.file}" controls class="news-img"></video>`
                : `<div class="news-img" style="background-image: url('${item.file}')"></div>`;
            card.innerHTML = `
                ${mediaHtml}
                <div class="news-content">
                    <small style="color: var(--primary)">${item.date}</small>
                    <h3>${item.title}</h3>
                    <p>${item.text}</p>
                </div>`;
            container.appendChild(card);
        });
    } catch (e) { console.log("Новостей пока нет"); }
}

// Загрузка КАБИНЕТОВ
async function loadRooms() {
    const container = document.getElementById('nav-content');
    if (!container) return;
    try {
        const response = await fetch('rooms.json?v=' + Date.now());
        if (!response.ok) throw new Error('Файл не найден');
        allRooms = await response.json();
        renderRooms(allRooms);
    } catch (e) { 
        console.error("Ошибка комнат:", e);
        container.innerHTML = '<p>Ошибка загрузки навигации</p>';
    }
}

function renderRooms(rooms) {
    const container = document.getElementById('nav-content');
    if (!container) return;
    container.innerHTML = '';
    rooms.forEach(room => {
        const card = document.createElement('div');
        card.className = 'room-card';
        card.innerHTML = `
            <div class="room-num">${room.id}</div>
            <div class="room-info">
                <strong>${room.name}</strong>
                <p>${room.teacher} • ${room.floor}</p>
            </div>`;
        container.appendChild(card);
    });
}

function filterRooms(query) {
    const lowerQuery = query.toLowerCase();
    const filtered = allRooms.filter(room => 
        room.id.toLowerCase().includes(lowerQuery) || 
        room.name.toLowerCase().includes(lowerQuery) || 
        room.teacher.toLowerCase().includes(lowerQuery)
    );
    renderRooms(filtered);
}

// Загрузка РАСПИСАНИЯ
async function loadSchedule() {
    const container = document.getElementById('schedule-container');
    if (!container) return;
    try {
        const response = await fetch('schedule.json?v=' + Date.now());
        const data = await response.json();
        const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
        const today = days[new Date().getDay()];
        const displayDay = (today === 'Воскресенье') ? 'Понедельник' : today;
        const daySchedule = data[displayDay] || [];
        
        let html = `<div class="current-day-label">Сегодня: ${displayDay}</div>`;
        if (daySchedule.length > 0) {
            html += `<table class="schedule-table"><tbody>`;
            daySchedule.forEach(item => {
                html += `<tr><td><b>${item.time}</b></td><td>${item.subject}</td><td>${item.room}</td></tr>`;
            });
            html += `</tbody></table>`;
        } else {
            html += '<p>На сегодня уроков нет</p>';
        }
        container.innerHTML = html;
    } catch (e) { console.log("Расписание не загружено"); }
}

// ==========================================
// 3. СИСТЕМНЫЕ ФУНКЦИИ (ИНТЕРФЕЙС)
// ==========================================

function openSection(sectionId, clickedButton) {
    const sections = document.querySelectorAll('.content-section');
    const buttons = document.querySelectorAll('.nav-btn');
    const targetSection = document.getElementById(sectionId);
    
    if (!targetSection) return;

    sections.forEach(s => s.classList.remove('active'));
    buttons.forEach(b => b.classList.remove('active'));

    targetSection.classList.add('active');

    if (clickedButton) {
        clickedButton.classList.add('active');
    } else {
        // Если кнопка не передана (при старте), ищем её по ID секции
        const btn = document.querySelector(`.nav-btn[onclick*="${sectionId}"]`);
        if (btn) btn.classList.add('active');
    }
}

function updateDateTime() {
    const clock = document.getElementById('clock');
    const dateEl = document.getElementById('date');
    if (!clock || !dateEl) return;
    
    const now = new Date();
    clock.textContent = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    dateEl.textContent = now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' });
}

// ==========================================
// 4. ГЛАВНЫЙ ЗАПУСК
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // Запускаем время
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Загружаем все данные
    loadNews();
    loadRooms();
    loadSchedule();
    
    // Открываем вкладку по умолчанию
    openSection('news');
});