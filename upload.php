<?php
error_reporting(0);
ini_set('display_errors', 0);
header('Content-Type: application/json; charset=utf-8');

$response = ["status" => "error", "message" => "Неизвестная ошибка"];

// 1. УДАЛЕНИЕ
if (isset($_POST['action']) && $_POST['action'] === 'delete') {
    $filesMap = ['news' => 'news.json', 'room' => 'rooms.json', 'info' => 'info.json', 'schedule' => 'schedule.json'];
    $json = $filesMap[$_POST['type']];
    $data = json_decode(file_get_contents($json), true);
    array_splice($data, (int)$_POST['index'], 1);
    file_put_contents($json, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    echo json_encode(['status' => 'success', 'message' => 'Удалено']);
    exit;
}

// 2. ЗАГРУЗКА ФАЙЛОВ
$uploadedFiles = [];
$type = $_POST['type'] ?? ''; // Получаем тип заранее

if (isset($_FILES['files'])) {
    // Определяем подпапку в зависимости от типа
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

// 3. ОБРАБОТКА ДАННЫХ
$type = $_POST['type'] ?? '';
$editIndex = isset($_POST['edit_index']) ? (int)$_POST['edit_index'] : -1;
$jsonFile = $type . '.json';
$data = file_exists($jsonFile) ? json_decode(file_get_contents($jsonFile), true) : [];

if ($type === 'news' || $type === 'info') {
   $newItem = [
        'title' => $_POST['title'] ?? '',
        'text' => $_POST['text'] ?? '',
        'date' => date('d.m.Y H:i'),
        // Теперь всегда сохраняем в массив images
        'images' => !empty($uploadedFiles) ? $uploadedFiles : ($editIndex >= 0 ? ($data[$editIndex]['images'] ?? []) : [])
    ];
} elseif ($type === 'room') {
    $newItem = ['id' => $_POST['room_id'], 'name' => $_POST['room_name'], 'teacher' => $_POST['room_teacher'], 'floor' => $_POST['room_floor']];
}

// 4. СОХРАНЕНИЕ
if ($editIndex >= 0) {
    $data[$editIndex] = $newItem;
    $message = "Обновлено";
} else {
    array_unshift($data, $newItem);
    $message = "Добавлено";
}

file_put_contents($jsonFile, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
echo json_encode(['status' => 'success', 'message' => $message]);
exit;