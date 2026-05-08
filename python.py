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
        
        # Классы всегда в первой строке
        classes = [str(c).strip() for c in df.iloc[0, start_col::2].dropna().tolist()]
        
        result = {}
        day_map = {
            "понедельник": "Понедельник", "вторник": "Вторник", 
            "среда": "Среда", "четверг": "Четверг", "пятница": "Пятница"
        }

        current_day = ""
        # Начинаем с 1 строки (индекс 0), чтобы ничего не пропустить
        for idx in range(len(df)):
            row = df.iloc[idx]
            
            # Читаем колонку А (день)
            val_a = str(row[0]).strip().lower() if pd.notna(row[0]) else ""
            if val_a in day_map:
                current_day = day_map[val_a]
            
            if not current_day: continue
            
            # Читаем номер урока (Колонка B)
            lesson_num = str(row[1]).strip() if pd.notna(row[1]) else ""
            
            # Если это строка с данными (есть хоть какой-то предмет в ряду)
            has_content = any(pd.notna(row[start_col + i*2]) for i in range(len(classes)))
            
            if has_content:
                if current_day not in result:
                    result[current_day] = {c: [] for c in classes}
                
                for i, cls in enumerate(classes):
                    col_idx = start_col + (i * 2)
                    if col_idx >= len(row): continue
                    
                    subject = row[col_idx]
                    room = row[col_idx + 1] if col_idx + 1 < len(row) else ""
                    
                    if pd.notna(subject) and str(subject).strip():
                        # Авто-нумерация, если в Excel забыли номер
                        final_num = lesson_num if (lesson_num and lesson_num.isdigit()) else str(len(result[current_day][cls]) + 1)
                        
                        if is_nachalka:
                            time_map = TIME_NACHALKA_2 if is_nachalka_2 else TIME_NACHALKA_1
                            current_time = time_map.get(final_num, "")
                        else:
                            current_time = str(row[2]) if pd.notna(row[2]) else ""

                        result[current_day][cls].append({
                            "num": final_num,
                            "time": current_time,
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

# --- ФИНАЛЬНАЯ СОРТИРОВКА И КЛИНАП ---
ordered_shifts = ["1_smena", "2_smena", "nachalka_1", "nachalka_2"]
ordered_days = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница"]

final_json = {}

for shift in ordered_shifts:
    if shift in raw_data:
        final_json[shift] = {}
        
        # Получаем список всех классов в этой смене
        all_classes = set()
        for day_name in raw_data[shift]:
            all_classes.update(raw_data[shift][day_name].keys())
        
        for cls in sorted(list(all_classes)):
            final_json[shift][cls] = {}
            # ЖЕСТКО идем по списку ordered_days
            for day in ordered_days:
                if day in raw_data[shift] and cls in raw_data[shift][day]:
                    lessons = raw_data[shift][day][cls]
                    if lessons: # Добавляем день, только если в нем есть уроки
                        final_json[shift][cls][day] = lessons

# Сохранение с принудительным обновлением пути
import os
current_dir = os.path.dirname(os.path.abspath(__file__))
target_path = os.path.join(current_dir, 'schedule.json')

with open(target_path, 'w', encoding='utf-8') as f:
    json.dump(final_json, f, ensure_ascii=False, indent=2)

print(f"\n>>> ПРОВЕРКА: Файл переписан. В смене nachalka_2 для первого класса первый день: {list(final_json.get('nachalka_2', {}).get('2А', {}).keys())[:1]}")