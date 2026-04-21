<?php
header('Content-Type: application/json');

$action = $_POST['action'] ?? 'add';
$type = $_POST['type'] ?? '';

// ФУНКЦИЯ УДАЛЕНИЯ
if ($action === 'delete') {
    $index = $_POST['index'];
    $fileMap = ['news' => 'news.json', 'room' => 'rooms.json', 'canteen' => 'canteen.json'];
    $fileName = $fileMap[$type];

    if (file_exists($fileName)) {
        $data = json_decode(file_get_contents($fileName), true);
        array_splice($data, $index, 1);
        file_put_contents($fileName, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        echo json_encode(['status' => 'success', 'message' => 'Удалено!']);
    }
    exit;
}

// ЛОГИКА ДОБАВЛЕНИЯ
if ($type === 'news') {
    $uploadDir = 'uploads/';
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
    $file = $_FILES['file'];
    $fileName = time() . '_' . $file['name'];
    move_uploaded_file($file['tmp_name'], $uploadDir . $fileName);
    
    $json = 'news.json';
    $posts = file_exists($json) ? json_decode(file_get_contents($json), true) : [];
    array_unshift($posts, [
        'title' => $_POST['title'],
        'text' => $_POST['text'],
        'file' => $uploadDir . $fileName,
        'type' => strpos($file['type'], 'video') !== false ? 'video' : 'image',
        'date' => date('d.m.Y')
    ]);
    file_put_contents($json, json_encode($posts, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    echo json_encode(['status' => 'success', 'message' => 'Новость добавлена']);
} 

elseif ($type === 'room') {
    $json = 'rooms.json';
    $rooms = file_exists($json) ? json_decode(file_get_contents($json), true) : [];
    $rooms[] = [
        'id' => $_POST['room_id'],
        'name' => $_POST['room_name'],
        'teacher' => $_POST['room_teacher'],
        'floor' => $_POST['room_floor']
    ];
    file_put_contents($json, json_encode($rooms, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    echo json_encode(['status' => 'success', 'message' => 'Кабинет добавлен']);
}

elseif ($type === 'canteen') {
    $json = 'canteen.json';
    $menu = file_exists($json) ? json_decode(file_get_contents($json), true) : [];
    $menu[] = [
        'name' => $_POST['item_name'],
        'price' => $_POST['item_price'],
        'description' => $_POST['item_desc'],
        'icon' => $_POST['item_icon']
    ];
    file_put_contents($json, json_encode($menu, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    echo json_encode(['status' => 'success', 'message' => 'Блюдо добавлено']);
}
?>