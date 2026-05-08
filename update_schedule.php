<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require 'vendor/autoload.php';
use PhpOffice\PhpSpreadsheet\IOFactory;

$files = [
    '1_smena' => 'Расписание 1 смена с января 2026_2.xlsx',
    '2_smena' => '2 смена с января 2026.xlsx',
    'nachalka' => 'Началка с января 2026.xlsx'
];

$result = [];

foreach ($files as $shiftKey => $fileName) {
    if (!file_exists($fileName)) {
        echo "❌ Файл не найден: $fileName <br>";
        continue;
    }

    $spreadsheet = IOFactory::load($fileName);
    foreach ($spreadsheet->getAllSheets() as $sheet) {
        $data = $sheet->toArray(null, true, true, true);
        $sheetName = $sheet->getTitle();
        
        // Определяем смену
        $currentShift = $shiftKey;
        if ($shiftKey === 'nachalka') {
            $currentShift = (strpos($sheetName, '1') !== false) ? 'nachalka_1' : 'nachalka_2';
        }

        // Ищем классы (обычно это 1-я или 2-я строка)
        $headerRow = $data[1]; 
        foreach ($headerRow as $col => $val) {
            $val = trim((string)$val);
            // Если в ячейке есть цифра и буква (например 5а, 11б)
            if (preg_match('/[0-9]/', $val) && mb_strlen($val) < 5) {
                $className = mb_strtolower($val);
                
                // Собираем уроки для этого класса
                $currentDay = "";
                foreach ($data as $rowIndex => $row) {
                    if ($rowIndex < 2) continue; // Пропускаем шапку

                    if (!empty($row['A']) && !is_numeric($row['A'])) {
                        $currentDay = trim($row['A']);
                    }

                    if ($currentDay && !empty($row[$col]) && strlen($row[$col]) > 2) {
                        $result[$currentShift][$className][$currentDay][] = [
                            'num' => $row['B'] ?? '',
                            'time' => $row['C'] ?? '',
                            'name' => $row[$col],
                            'room' => $data[$rowIndex][chr(ord($col) + 1)] ?? '' // Кабинет в следующей колонке
                        ];
                    }
                }
            }
        }
    }
}

file_put_contents('data/schedule.json', json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
echo "<h1>Готово!</h1><p>Проверь кнопки на сайте.</p>";