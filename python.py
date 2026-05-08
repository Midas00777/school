import pandas as pd
import json
import os

# --- КОНСТАНТЫ ВРЕМЕНИ ДЛЯ НАЧАЛЬНОЙ ШКОЛЫ ---
# Используются для автоматической подстановки, так как в Excel эти колонки смещены
TIME_NACHALKA_1 = {
    "1": "08:00 - 08:40",
    "2": "08:50 - 09:30",
    "3": "09:50 - 10:30",
    "4": "10:50 - 11:30",
    "5": "11:40 - 12:20"
}

TIME_NACHALKA_2 = {
    "1": "13:30 - 14:10",
    "2": "14:20 - 15:00",
    "3": "15:20 - 16:00",
    "4": "16:10 - 16:50",
    "5": "17:00 - 17:40"
}

def parse_schedule_generic(file_path, sheet_name, start_col, is_nachalka=False, is_nachalka_2=False):
    try:
        df = pd.read_excel(file_path, sheet_name=sheet_name, header=None)
        
        # Названия классов: строка 1 (индекс 0), начиная с start_col через один столбец
        classes = df.iloc[0, start_col::2].dropna().tolist()
        classes = [str(c).strip() for c in classes]
        
        result = {}
        day_map = {
            "понедельник": "Понедельник", "вторник": "Вторник", 
            "среда": "Среда", "четверг": "Четверг", "пятница": "Пятница"
        }

        current_day = ""
        # Для Началки 2 данные начинаются с 11 строки, для остальных — со 2-й
        start_row = 11 if is_nachalka_2 else 2

        for idx in range(start_row, len(df)):
            row = df.iloc[idx]
            
            # 1. Определяем день недели (Колонка A)
            val_a = str(row[0]).strip().lower() if pd.notna(row[0]) else ""
            if val_a in day_map:
                current_day = day_map[val_a]
            
            if not current_day: continue
            
            # 2. Определяем номер урока (Колонка B)
            lesson_num = str(row[1]).strip() if pd.notna(row[1]) else ""
            
            # Проверка на пустую строку
            has_lesson_content = any(pd.notna(row[start_col + i*2]) for i in range(len(classes)))
            if not lesson_num and not has_lesson_content:
                continue

            if current_day not in result:
                result[current_day] = {c: [] for c in classes}
            
            # ... (начало цикла по классам остается прежним)
            for i, cls in enumerate(classes):
                col_idx = start_col + (i * 2)
                if col_idx >= len(row): continue
                
                subject = row[col_idx]
                room = row[col_idx + 1] if col_idx + 1 < len(row) else ""
                
                if pd.notna(subject) and str(subject).strip():
                    # 1. ОПРЕДЕЛЯЕМ ПОРЯДКОВЫЙ НОМЕР УРОКА
                    # Если номера нет в Excel (lesson_num), берем текущую длину списка уроков + 1
                    final_num = lesson_num if lesson_num else str(len(result[current_day][cls]) + 1)

                    # 2. ОПРЕДЕЛЯЕМ ВРЕМЯ
                    if is_nachalka:
                        time_map = TIME_NACHALKA_2 if is_nachalka_2 else TIME_NACHALKA_1
                        # Берем время из словаря по порядковому номеру
                        current_time = time_map.get(final_num, "")
                    else:
                        current_time = str(row[2]) if pd.notna(row[2]) else ""

                    result[current_day][cls].append({
                        "num": final_num, # Номер теперь всегда будет (1, 2, 3...)
                        "time": current_time, # Время подтянется по номеру
                        "name": str(subject).strip(),
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
f1 = 'Расписание 1 смена с января 2026.xlsx'
f2 = '2 смена с января 2026.xlsx'
fn = 'Началка с января 2026.xlsx'

# Сбор данных по всем сменам
s1 = get_sheet_name(f1, '5-11')
if s1: raw_data["1_smena"] = parse_schedule_generic(f1, s1, 3)

s2 = get_sheet_name(f2, '1')
if s2: raw_data["2_smena"] = parse_schedule_generic(f2, s2, 3)

sn1 = get_sheet_name(fn, 'началка 1')
if sn1: raw_data["nachalka_1"] = parse_schedule_generic(fn, sn1, 2, is_nachalka=True, is_nachalka_2=False)

sn2 = get_sheet_name(fn, 'началка 2')
if sn2: raw_data["nachalka_2"] = parse_schedule_generic(fn, sn2, 2, is_nachalka=True, is_nachalka_2=True)

# --- ГАРАНТИЯ ПОРЯДКА И СТРУКТУРЫ ДЛЯ САЙТА ---
ordered_shifts = ["1_smena", "2_smena", "nachalka_1", "nachalka_2"]
ordered_days = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница"]

final_json = {}

for shift in ordered_shifts:
    if shift in raw_data:
        final_json[shift] = {}
        
        # Собираем все классы из этой смены
        all_classes = set()
        for day in raw_data[shift]:
            all_classes.update(raw_data[shift][day].keys())
        
        # Формируем структуру: Смена -> Класс -> День недели (по порядку)
        for cls in sorted(list(all_classes)):
            final_json[shift][cls] = {}
            for day in ordered_days:
                if day in raw_data[shift] and cls in raw_data[shift][day]:
                    final_json[shift][cls][day] = raw_data[shift][day][cls]

# Сохранение итогового файла
with open('schedule.json', 'w', encoding='utf-8') as f:
    json.dump(final_json, f, ensure_ascii=False, indent=2)

print("\n>>> ГОТОВО! schedule.json обновлен. Проверь время в начальной школе.")