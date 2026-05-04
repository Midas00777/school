import pandas as pd
import json
import os

# 1. Функция парсинга с исправлением порядка и структуры
def parse_schedule_generic(file_path, sheet_name, start_col, is_nachalka=False):
    try:
        df = pd.read_excel(file_path, sheet_name=sheet_name, header=None)
        
        # Названия классов: строка 1 (индекс 0), начиная с start_col через один столбец
        classes = df.iloc[0, start_col::2].dropna().tolist()
        classes = [str(c).strip() for c in classes]
        
        result = {}
        # Если колонка A в началке пустая, по умолчанию стартуем с Понедельника
        current_day = "Понедельник" if is_nachalka else ""
        
        # Словарь для исправления опечаток и регистра
        day_map = {
            "понедельник": "Понедельник", "вторник": "Вторник", 
            "среда": "Среда", "четверг": "Четверг", "пятница": "Пятница"
        }

        # В началке 2 уроки начинаются с 12-й строки (индекс 11)
        start_row = 11 if is_nachalka else 2

        for idx in range(start_row, len(df)):
            row = df.iloc[idx]
            
            # Проверяем день недели в колонке A (индекс 0)
            day_val = str(row[0]).strip().lower() if pd.notna(row[0]) else ""
            if day_val in day_map:
                current_day = day_map[day_val]
            
            if not current_day: continue
            
            # Проверяем, есть ли хоть один урок в этой строке
            has_lesson = any(pd.notna(row[start_col + i*2]) for i in range(len(classes)))
            if not has_lesson: continue

            if current_day not in result:
                result[current_day] = {c: [] for c in classes}
            
            for i, cls in enumerate(classes):
                col_idx = start_col + (i * 2)
                if col_idx >= len(row): continue
                
                lesson_name = row[col_idx]
                room = row[col_idx + 1] if col_idx + 1 < len(row) else ""
                
                if pd.notna(lesson_name) and str(lesson_name).strip():
                    # Номер урока: берем из файла или считаем автоматически
                    num = str(row[1]) if pd.notna(row[1]) else str(len(result[current_day][cls]) + 1)
                    
                    result[current_day][cls].append({
                        "num": num,
                        "time": str(row[2]) if pd.notna(row[2]) else "",
                        "name": str(lesson_name).strip(),
                        "room": str(room).strip() if pd.notna(room) else ""
                    })
        return result
    except Exception as e:
        print(f"--- Ошибка в листе {sheet_name}: {e}")
        return {}

def get_sheet_name(file_path, keyword):
    if not os.path.exists(file_path): return None
    try:
        xl = pd.ExcelFile(file_path)
        for sheet in xl.sheet_names:
            if keyword.lower() in sheet.lower(): return sheet
        return xl.sheet_names[0]
    except: return None

# --- ОСНОВНОЙ ПРОЦЕСС ---
raw_data = {}
f1, f2, fn = 'Расписание 1 смена с января 2026.xlsx', '2 смена с января 2026.xlsx', 'Началка с января 2026.xlsx'

# Сбор данных
s1 = get_sheet_name(f1, '5-11')
if s1: raw_data["1_smena"] = parse_schedule_generic(f1, s1, 3)

s2 = get_sheet_name(f2, '1')
if s2: raw_data["2_smena"] = parse_schedule_generic(f2, s2, 3)

sn1 = get_sheet_name(fn, 'началка 1')
if sn1: raw_data["nachalka_1"] = parse_schedule_generic(fn, sn1, 2, is_nachalka=True)

sn2 = get_sheet_name(fn, 'началка 2')
if sn2: 
    print(f"Парсинг Началки 2 (лист: {sn2})...")
    raw_data["nachalka_2"] = parse_schedule_generic(fn, sn2, 2, is_nachalka=True)

# --- ГАРАНТИЯ ПОРЯДКА ДЛЯ САЙТА ---
ordered_shifts = ["1_smena", "2_smena", "nachalka_1", "nachalka_2"]
ordered_days = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница"]

final_json = {}

for shift in ordered_shifts:
    if shift in raw_data:
        # Пересобираем словарь с правильным порядком дней
        final_json[shift] = {
            day: raw_data[shift][day] 
            for day in ordered_days if day in raw_data[shift]
        }

# Сохранение
with open('schedule.json', 'w', encoding='utf-8') as f:
    json.dump(final_json, f, ensure_ascii=False, indent=2)

print("\n>>> Готво! Кнопки дней теперь в ПРАВИЛЬНОМ порядке, а Началка 2 заполнена.")