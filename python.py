import pandas as pd
import json
import os

# --- КОНСТАНТЫ ВРЕМЕНИ ДЛЯ НАЧАЛЬНОЙ ШКОЛЫ ---
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
    if not os.path.exists(file_path):
        print(f"❌ Файл не найден: {file_path}")
        return {}

    try:
        df = pd.read_excel(file_path, sheet_name=sheet_name, header=None)
        
        # Классы
        classes = [str(c).strip().lower() for c in df.iloc[0, start_col::2].dropna().tolist()]
        
        result_by_day = {}
        day_map = {
            "понедельник": "Понедельник", "вторник": "Вторник", 
            "среда": "Среда", "четверг": "Четверг", "пятница": "Пятница"
        }

        current_day = ""
        
        for idx in range(1, len(df)):
            row = df.iloc[idx]
            
            val_a = str(row[0]).strip().lower() if pd.notna(row[0]) else ""
            if val_a in day_map:
                current_day = day_map[val_a]
            
            if not current_day:
                continue
            
            lesson_num_raw = str(row[1]).strip() if pd.notna(row[1]) else ""
            
            has_content = any(pd.notna(row[start_col + i*2]) for i in range(len(classes)))
            if not has_content:
                continue

            if current_day not in result_by_day:
                result_by_day[current_day] = {c: [] for c in classes}
            
            for i, cls in enumerate(classes):
                subj_col = start_col + (i * 2)
                room_col = subj_col + 1
                
                if subj_col >= len(row): continue
                
                # --- ОБРАБОТКА ПРЕДМЕТА ---
                raw_subject = str(row[subj_col]).strip() if pd.notna(row[subj_col]) else ""
                
                if not raw_subject or raw_subject.lower() in ["предмет", "название", "nan"]:
                    continue

                # Заменяем перенос строки на слеш, чтобы группы (Англ/Англ) были в одну строку
                subject = raw_subject.replace('\n', ' / ')
                
                # Определяем номер и время
                final_num = lesson_num_raw if lesson_num_raw.isdigit() else str(len(result_by_day[current_day][cls]) + 1)
                
                if is_nachalka:
                    time_map = TIME_NACHALKA_2 if is_nachalka_2 else TIME_NACHALKA_1
                    current_time = time_map.get(final_num, "")
                else:
                    current_time = str(row[2]).strip() if pd.notna(row[2]) else ""

                # --- ОБРАБОТКА КАБИНЕТА ---
                raw_room = str(row[room_col]).strip() if room_col < len(row) and pd.notna(row[room_col]) else ""
                # Тоже заменяем переносы на слеш для кабинетов (205 / 301)
                room = raw_room.replace('\n', ' / ')
                
                result_by_day[current_day][cls].append({
                    "num": final_num,
                    "time": current_time,
                    "name": subject,
                    "room": room
                })
                
        return result_by_day

    except Exception as e:
        print(f"⚠️ Ошибка при обработке листа '{sheet_name}': {e}")
        return {}

def get_sheet_name(file_path, keyword):
    try:
        xl = pd.ExcelFile(file_path)
        for sheet in xl.sheet_names:
            if keyword.lower() in sheet.lower():
                return sheet
        return xl.sheet_names[0]
    except:
        return None

if __name__ == "__main__":
    raw_data = {}
    f_s1 = 'Расписание 1 смена с января 2026.xlsx'
    f_s2 = '2 смена с января 2026.xlsx'
    f_n  = 'Началка с января 2026.xlsx'

    s1_name = get_sheet_name(f_s1, '5-11')
    if s1_name:
        raw_data["1_smena"] = parse_schedule_generic(f_s1, s1_name, 3)

    s2_name = get_sheet_name(f_s2, '1')
    if s2_name:
        raw_data["2_smena"] = parse_schedule_generic(f_s2, s2_name, 3)

    n1_name = get_sheet_name(f_n, '1 смена')
    if n1_name:
        raw_data["nachalka_1"] = parse_schedule_generic(f_n, n1_name, 2, is_nachalka=True)

    n2_name = get_sheet_name(f_n, '2 смена')
    if n2_name:
        raw_data["nachalka_2"] = parse_schedule_generic(f_n, n2_name, 2, is_nachalka=True, is_nachalka_2=True)

    ordered_shifts = ["1_smena", "2_smena", "nachalka_1", "nachalka_2"]
    ordered_days = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница"]
    
    final_json = {}

    for shift in ordered_shifts:
        if shift not in raw_data: continue
        final_json[shift] = {}
        unique_classes = set()
        for day in raw_data[shift]:
            unique_classes.update(raw_data[shift][day].keys())
        
        for cls in sorted(list(unique_classes)):
            final_json[shift][cls] = {}
            for day in ordered_days:
                if day in raw_data[shift] and cls in raw_data[shift][day]:
                    day_lessons = raw_data[shift][day][cls]
                    if day_lessons:
                        final_json[shift][cls][day] = day_lessons

    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'schedule.json')
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(final_json, f, ensure_ascii=False, indent=2)
        print(f"✅ Готово! Расписание сохранено в: {output_path}")
    except Exception as e:
        print(f"❌ Ошибка сохранения файла: {e}")