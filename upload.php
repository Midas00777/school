<?php
error_reporting(0);
ini_set('display_errors', 0);
header('Content-Type: application/json; charset=utf-8');

$response = ["status" => "error", "message" => "Неизвестная ошибка"];

// 1. КАРТА СООТВЕТСТВИЯ ТИПОВ И ФАЙЛОВ
$filesMap = [
    'news'     => 'news.json',
    'room'     => 'rooms.json', // Исправлено: теперь строго rooms.json
    'info'     => 'info.json',
    'schedule' => 'schedule.json'
];

// 2. ЛОГИКА УДАЛЕНИЯ
if (isset($_POST['action']) && $_POST['action'] === 'delete') {
    $type = $_POST['type'] ?? '';
    $jsonFile = $filesMap[$type] ?? ($type . '.json');

    if (file_exists($jsonFile)) {
        $data = json_decode(file_get_contents($jsonFile), true);
        if (is_array($data)) {
            array_splice($data, (int)$_POST['index'], 1);
            file_put_contents($jsonFile, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
            echo json_encode(['status' => 'success', 'message' => 'Удалено']);
            exit;
        }
    }
    echo json_encode(['status' => 'error', 'message' => 'Файл не найден']);
    exit;
}

// 3. ЗАГРУЗКА ИЗОБРАЖЕНИЙ
$uploadedFiles = [];
$type = $_POST['type'] ?? '';

if (isset($_FILES['files'])) {
    $subDir = ($type === 'info') ? 'info/' : 'news/';
    $uploadDir = 'uploads/' . $subDir;
    
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
    
    foreach ($_FILES['files']['name'] as $key => $val) {
        if ($_FILES['files']['error'][$key] === UPLOAD_ERR_OK) {
            $ext = pathinfo($_FILES['files']['name'][$key], PATHINFO_EXTENSION);
            $fileName = uniqid() . '_' . $key . '.' . $ext;
            $fullPath = $uploadDir . $fileName;
            if (move_uploaded_file($_FILES['files']['tmp_name'][$key], $fullPath)) {
                $uploadedFiles[] = $fullPath;
            }
        }
    }
}

// 4. ПОДГОТОВКА ДАННЫХ ДЛЯ СОХРАНЕНИЯ
$editIndex = isset($_POST['edit_index']) ? (int)$_POST['edit_index'] : -1;
$jsonFile = $filesMap[$type] ?? ($type . '.json');

// Загружаем текущие данные из правильного файла
$data = file_exists($jsonFile) ? json_decode(file_get_contents($jsonFile), true) : [];
if (!is_array($data)) $data = [];

$newItem = [];

if ($type === 'news' || $type === 'info') {
   $newItem = [
        'title' => $_POST['title'] ?? '',
        'text' => $_POST['text'] ?? '',
        'date' => date('d.m.Y H:i'),
        'images' => !empty($uploadedFiles) ? $uploadedFiles : ($editIndex >= 0 ? ($data[$editIndex]['images'] ?? []) : [])
    ];
} elseif ($type === 'room') {
    $newItem = [
        'id'      => $_POST['room_id'], 
        'name'    => $_POST['room_name'], 
        'teacher' => $_POST['room_teacher'], 
        'floor'   => $_POST['room_floor']
    ];
}

// 5. СОХРАНЕНИЕ (ОБНОВЛЕНИЕ ИЛИ ДОБАВЛЕНИЕ)
if ($editIndex >= 0) {
    $data[$editIndex] = $newItem;
    $message = "Обновлено успешно";
} else {
    // Новые новости — в начало, новые комнаты — в конец
    if ($type === 'room') {
        $data[] = $newItem; 
    } else {
        array_unshift($data, $newItem);
    }
    $message = "Добавлено успешно";
}

// Записываем результат в файл
if (file_put_contents($jsonFile, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT))) {
    echo json_encode(['status' => 'success', 'message' => $message]);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Не удалось записать в файл']);
}
exit;