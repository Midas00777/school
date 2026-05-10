<?php
header('Content-Type: application/json; charset=utf-8');

// 1. Проверяем, пришел ли файл
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['menu_file'])) {
    $type = $_POST['menu_type'] ?? 'regular';
    $uploadDir = 'menus/';
    
    // Создаем папку, если её нет
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    $file = $_FILES['menu_file'];
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    
    // Формируем имя: main_menu.pdf или diabetic_menu.pdf (или .png/.jpg)
    $finalFileName = ($type === 'regular' ? 'main_menu.' : 'diabetic_menu.') . $extension;
    $uploadPath = $uploadDir . $finalFileName;

    // Удаляем старые файлы с таким именем, но разными расширениями (чтобы не было путаницы)
    $mask = $uploadDir . ($type === 'regular' ? 'main_menu.*' : 'diabetic_menu.*');
    array_map('unlink', glob($mask));

    // Перемещаем загруженный файл
    if (move_uploaded_file($file['tmp_name'], $uploadPath)) {
        echo json_encode(["status" => "success", "path" => $uploadPath]);
    } else {
        echo json_encode(["status" => "error", "message" => "Не удалось сохранить файл на сервере"]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Файл не получен"]);
}
?>