import pandas as pd
import json

def parse_sheet(file_path, sheet_name, start_row=2, class_row=0):
    try:
        df = pd.read_excel(file_path, sheet_name=sheet_name, header=None)
        # Названия классов — берем каждую вторую колонку, начиная с нужной
        classes = df.iloc[class_row, :].dropna().unique()
        # Фильтруем, оставляя только те, что похожи на классы (например, 5а, 11б)
        classes = [c for c in classes if any(char.isdigit() for char in str(c))]
        
        result = {}
        current_day = ""
        
        # Определяем колонки для каждого класса
        class_mapping = {}
        header_row = df.iloc[class_row, :].tolist()
        for cls in classes:
            col_idx = header_row.index(cls)
            class_mapping[cls] = col_idx

        for idx in range(start_row, len(df)):
            row = df.iloc[idx]
            if pd.notna(row[0]): # Если в первой колонке день недели
                current_day = row[0].strip()
            
            if not current_day: continue
            if current_day not in result: result[current_day] = {c: [] for c in classes}
            
            for cls, col_idx in class_mapping.items():
                lesson = row[col_idx]
                room = row[col_idx + 1] if col_idx + 1 < len(row) else ""
                
                if pd.notna(lesson) and str(lesson).strip():
                    result[current_day][cls].append({
                        "lesson": str(lesson).strip(),
                        "room": str(room).strip() if pd.notna(room) else ""
                    })
        return result
    except Exception as e:
        print(f"Ошибка в файле {file_path}, лист {sheet_name}: {e}")
        return {}

# Генерируем новый JSON
full_schedule = {
    "1_smena": parse_sheet('Расписание 1 смена с января 2026.xlsx', '5-11'),
    "2_smena": parse_sheet('2 смена с января 2026.xlsx', '1'),
    "nachalka_1": parse_sheet('Началка с января 2026.xlsx', 'началка 1 смена', class_row=0),
    "nachalka_2": parse_sheet('Началка с января 2026.xlsx', 'началка 2 смена', class_row=0)
}

with open('schedule.json', 'w', encoding='utf-8') as f:
    json.dump(full_schedule, f, ensure_ascii=False, indent=2)

print("Готово! schedule.json обновлен.")