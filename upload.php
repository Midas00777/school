<?php
// Отключаем вывод любых ошибок в тело ответа, чтобы не портить JSON
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
    exit; // Важно: выходим сразу
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

$jsonFile = $files[$type];
$data = file_exists($jsonFile) ? json_decode(file_get_contents($jsonFile), true) : [];
if (!is_array($data)) $data = [];

// Логика загрузки файла
$filePath = "";
if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
    $uploadDir = 'uploads/';
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
    $ext = pathinfo($_FILES['file']['name'], PATHINFO_EXTENSION);
    $fileName = uniqid() . '.' . $ext;
    if (move_uploaded_file($_FILES['file']['tmp_name'], $uploadDir . $fileName)) {
        $filePath = $uploadDir . $fileName;
    }
}

$newItem = [];

if ($type === 'news') {
    $newItem = [
        'title' => $_POST['title'],
        'text' => $_POST['text'],
        'date' => date('d.m.Y'),
        'file' => $filePath,
        'type' => (isset($_FILES['file']) && strpos($_FILES['file']['type'], 'video') !== false) ? 'video' : 'image'
    ];
} elseif ($type === 'info') {
    $newItem = [
        'title' => $_POST['info_title'],
        'text' => $_POST['info_text'],
        'file' => $filePath
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

// Финальное сохранение для всех типов, кроме столовой (у неё своя логика выше)
if ($type !== 'canteen') {
    if ($editIndex >= 0 && isset($data[$editIndex])) {
        // При редактировании сохраняем старый файл, если новый не загружен
        if (empty($filePath) && isset($data[$editIndex]['file'])) {
            $newItem['file'] = $data[$editIndex]['file'];
            if ($type === 'news') $newItem['type'] = $data[$editIndex]['type'];
        }
        $data[$editIndex] = $newItem;
        $response = ['status' => 'success', 'message' => 'Изменения сохранены'];
    } else {
        $data[] = $newItem;
        $response = ['status' => 'success', 'message' => 'Запись добавлена'];
    }
}

// Записываем в файл ОДИН РАЗ в самом конце
file_put_contents($jsonFile, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

// Выводим ответ ОДИН РАЗ и завершаем работу
echo json_encode($response);
exit;
?>