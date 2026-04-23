<?php
header('Content-Type: application/json; charset=utf-8');

// 1. УДАЛЕНИЕ (Блюда столовой)
if (isset($_POST['action']) && $_POST['action'] === 'delete_canteen') {
    $json = 'canteen.json';
    $data = json_decode(file_get_contents($json), true);
    unset($data[$_POST['catIndex']]['items'][$_POST['itemIndex']]);
    $data[$_POST['catIndex']]['items'] = array_values($data[$_POST['catIndex']]['items']);
    if (empty($data[$_POST['catIndex']]['items'])) {
        unset($data[$_POST['catIndex']]);
        $data = array_values($data);
    }
    file_put_contents($json, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    echo json_encode(['status' => 'success', 'message' => 'Удалено']);
    exit;
}

// 2. УДАЛЕНИЕ (Обычное)
if (isset($_POST['action']) && $_POST['action'] === 'delete') {
    $files = ['news' => 'news.json', 'room' => 'rooms.json', 'info' => 'info.json', 'schedule' => 'schedule.json'];
    $json = $files[$_POST['type']];
    $data = json_decode(file_get_contents($json), true);
    array_splice($data, (int)$_POST['index'], 1);
    file_put_contents($json, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    echo json_encode(['status' => 'success', 'message' => 'Удалено']);
    exit;
}

// 3. ДОБАВЛЕНИЕ И РЕДАКТИРОВАНИЕ
$type = $_POST['type'] ?? '';
$editIndex = isset($_POST['edit_index']) ? (int)$_POST['edit_index'] : -1;

$files = [
    'news' => 'news.json',
    'room' => 'rooms.json',
    'canteen' => 'canteen.json',
    'info' => 'info.json',
    'schedule' => 'schedule.json'
];

if (!isset($files[$type])) {
    echo json_encode(['status' => 'error', 'message' => 'Неверный тип данных']);
    exit;
}

$json = $files[$type];
$data = file_exists($json) ? json_decode(file_get_contents($json), true) : [];
if (!is_array($data)) $data = [];

$newItem = [];

// Сбор данных по типам
if ($type === 'info') {
    $newItem = [
        'title' => $_POST['info_title'],
        'text' => $_POST['info_text']
    ];
} elseif ($type === 'news') {
    // ... логика новостей (картинки и т.д.) ...
    $newItem = ['title' => $_POST['title'], 'text' => $_POST['text'], 'date' => date('d.m.Y')];
} elseif ($type === 'room') {
    $newItem = ['id' => $_POST['room_id'], 'name' => $_POST['room_name'], 'teacher' => $_POST['room_teacher'], 'floor' => $_POST['room_floor']];
} elseif ($type === 'schedule') {
    $newItem = ['day' => $_POST['day'], 'time' => $_POST['time'], 'subject' => $_POST['subject'], 'room' => $_POST['room']];
}

// Логика сохранения для Инфо, Новостей, Кабинетов
if ($type !== 'canteen') {
    if ($editIndex >= 0 && isset($data[$editIndex])) {
        $data[$editIndex] = $newItem;
        $msg = "Изменения сохранены";
    } else {
        $data[] = $newItem;
        $msg = "Запись добавлена";
    }
} else {
    // Особая логика для столовой (категории)
    $categoryName = $_POST['category'];
    $canteenItem = [
        'name' => $_POST['name'], 'price' => $_POST['price'], 'weight' => $_POST['weight'],
        'kcal' => $_POST['kcal'], 'prot' => $_POST['prot'], 'fat' => $_POST['fat'], 'carb' => $_POST['carb'],
        'icon' => $_POST['icon'] ?: '🍽️'
    ];
    
    $found = false;
    foreach ($data as &$catGroup) {
        if ($catGroup['category'] === $categoryName) {
            $catGroup['items'][] = $canteenItem;
            $found = true; break;
        }
    }
    if (!$found) $data[] = ['category' => $categoryName, 'items' => [$canteenItem]];
    $msg = "Блюдо добавлено";
}

file_put_contents($json, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
echo json_encode(['status' => 'success', 'message' => $msg]);