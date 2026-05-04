<?php
error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json; charset=utf-8');

$response = ["status" => "error", "message" => "Неизвестная ошибка"];

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
    $filesMap = ['news' => 'news.json', 'room' => 'rooms.json', 'info' => 'info.json', 'schedule' => 'schedule.json'];
    $json = $filesMap[$_POST['type']];
    $data = json_decode(file_get_contents($json), true);
    array_splice($data, (int)$_POST['index'], 1);
    file_put_contents($json, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    echo json_encode(['status' => 'success', 'message' => 'Удалено']);
    exit;
}

// 3. ПОДГОТОВКА ДАННЫХ
$type = $_POST['type'] ?? '';
$editIndex = isset($_POST['edit_index']) ? (int)$_POST['edit_index'] : -1;

$filesMap = [
    'news' => 'news.json',
    'room' => 'rooms.json',
    'canteen' => 'canteen.json',
    'info' => 'info.json',
    'schedule' => 'schedule.json'
];

if (!isset($filesMap[$type])) {
    echo json_encode(['status' => 'error', 'message' => 'Неверный тип данных']);
    exit;
}

$jsonFile = $filesMap[$type];
$data = file_exists($jsonFile) ? json_decode(file_get_contents($jsonFile), true) : [];
if (!is_array($data)) $data = [];

// --- НОВАЯ ЛОГИКА ЗАГРУЗКИ НЕСКОЛЬКИХ ФАЙЛОВ ---
$uploadedFiles = [];
if (isset($_FILES['files'])) {
    $uploadDir = 'uploads/';
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

// Если старый способ загрузки одного файла всё еще используется где-то (например, в Инфо)
$singleFilePath = "";
if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
    $uploadDir = 'uploads/';
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
    $ext = pathinfo($_FILES['file']['name'], PATHINFO_EXTENSION);
    $fileName = uniqid() . '.' . $ext;
    if (move_uploaded_file($_FILES['file']['tmp_name'], $uploadDir . $fileName)) {
        $singleFilePath = $uploadDir . $fileName;
    }
}

$newItem = [];

// --- СБОРКА ОБЪЕКТА ---
if ($type === 'news') {
    $newItem = [
        'title' => $_POST['title'],
        'text' => $_POST['text'],
        'date' => date('d.m.Y'),
        'files' => $uploadedFiles // Записываем массив путей
    ];
} elseif ($type === 'info') {
    $newItem = [
        'title' => $_POST['info_title'],
        'text' => $_POST['info_text'],
        'file' => $singleFilePath
    ];
} elseif ($type === 'room') {
    $newItem = ['id' => $_POST['room_id'], 'name' => $_POST['room_name'], 'teacher' => $_POST['room_teacher'], 'floor' => $_POST['room_floor']];
} elseif ($type === 'schedule') {
    $newItem = ['day' => $_POST['day'], 'time' => $_POST['time'], 'subject' => $_POST['subject'], 'room' => $_POST['room']];
} elseif ($type === 'canteen') {
    $categoryName = $_POST['category'];
    $canteenItem = [
        'name' => $_POST['name'], 'price' => $_POST['price'], 'weight' => $_POST['weight'],
        'kcal' => $_POST['kcal'], 'prot' => $_POST['prot'], 'fat' => $_POST['fat'], 'carb' => $_POST['carb'],
        'icon' => '🍽️'
    ];

    $found = false;
    foreach ($data as &$catGroup) {
        if ($catGroup['category'] === $categoryName) {
            $catGroup['items'][] = $canteenItem;
            $found = true; break;
        }
    }
    if (!$found) $data[] = ['category' => $categoryName, 'items' => [$canteenItem]];
    $response = ['status' => 'success', 'message' => 'Блюдо добавлено'];
}

// --- СОХРАНЕНИЕ ---
if ($type !== 'canteen') {
    if ($editIndex >= 0 && isset($data[$editIndex])) {
        // Логика сохранения старых фото при редактировании
        if ($type === 'news' && empty($uploadedFiles)) {
            $newItem['files'] = $data[$editIndex]['files'] ?? [];
        } elseif ($type === 'info' && empty($singleFilePath)) {
            $newItem['file'] = $data[$editIndex]['file'] ?? '';
        }
        $data[$editIndex] = $newItem;
        $response = ['status' => 'success', 'message' => 'Изменения сохранены'];
    } else {
        $data[] = $newItem;
        $response = ['status' => 'success', 'message' => 'Запись добавлена'];
    }
}

file_put_contents($jsonFile, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
echo json_encode($response);
exit;
?>