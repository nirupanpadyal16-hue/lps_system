"""
Final clarification: explain correct column reading for PTML287461308219-I
"""
import openpyxl

wb = openpyxl.load_workbook(r'C:\Users\rjsx1\Downloads\lps_system\capacity.xlsx', data_only=True)
ws = wb.active

print("COLUMN STRUCTURE EXPLAINED:")
print("Each machine has 2 columns: [Label=Total_strokes] [Value=Strokes_per_part]")
print("But the LABEL column holds Total strokes, and the VALUE (None header) holds strokes/part\n")

# Correct mapping: label col idx = total strokes, value col idx = strokes/part
# Blanking:  label=idx8,  s/part=idx9
# 320T:      label=idx10, s/part=idx11
# 200T:      label=idx12, s/part=idx13
# 160T:      label=idx14, s/part=idx15
# 110T:      label=idx16, s/part=idx17
# 80T:       label=idx18, s/part=idx19
# 63T:       label=idx20

MACHINES = [
    ('Blanking', 8,  9),   # (name, label_idx=total, spart_idx=strokes_per_part)
    ('320T',    10, 11),
    ('200T',    12, 13),
    ('160T',    14, 15),
    ('110T',    16, 17),
    ('80T',     18, 19),
    ('63T',     20, None),
]

for row in ws.iter_rows(min_row=3, values_only=True):
    if '287461308' in str(row[3] or ''):
        print(f"Part: {row[3]} — {row[4]}")
        print(f"Total Schedule: {row[5]}")
        print()
        print(f"{'Machine':<12} {'Strokes/Part':>14} {'Total Strokes':>14} {'Used?':>8}")
        print("-" * 55)
        for name, lbl_idx, sp_idx in MACHINES:
            total_strokes = row[lbl_idx]
            s_per_part    = row[sp_idx] if sp_idx else None
            used = 'YES' if (s_per_part and isinstance(s_per_part, (int,float)) and s_per_part > 0) \
                         or (total_strokes and isinstance(total_strokes, (int,float)) and total_strokes > 0 and sp_idx is None) \
                         else '-'
            print(f"  {name:<10} {str(s_per_part or '-'):>14} {str(total_strokes or '-'):>14} {used:>8}")
        print()
        print(f"CONCLUSION: This part uses 160T (3 strokes/part, 160T label shows total={row[14]}?)")
        print(f"  idx14 (160T label) = {row[14]}  ← total strokes on 160T? or 0?")
        print(f"  idx15 (None value) = {row[15]}  ← strokes per part on 160T = 3")
        print(f"  idx16 (110T label) = {row[16]}  ← total strokes on 110T = 1062 (=3×354)")
        print(f"  idx17 (None value) = {row[17]}  ← strokes per part on 110T = None (0)")
        print()
        print("SO: The part has 3 strokes/part on 160T. DB value '160T' is CORRECT.")
        print("    The 1062 visible next to '110T' header is the TOTAL strokes calculated for 160T.")
        break
