import openpyxl, glob

files = glob.glob(r'C:\Users\rjsx1\Downloads\lps_system\LPS G CHART*')
filepath = [f for f in files if not f.startswith('~')][0]
wb = openpyxl.load_workbook(filepath, data_only=True)
ws = wb['Capacity']

print("Parts with BLANKING strokes > 0:")
print("-" * 100)

count = 0
only_blanking = 0  # parts where ONLY blanking is used, no press machine

for row in ws.iter_rows(min_row=3, values_only=True):
    if not isinstance(row[0], (int, float)):
        continue
    sap    = str(row[3]) if row[3] else ''
    blank  = row[9]
    t320   = row[11]
    t200   = row[13]
    t160   = row[15]
    t110   = row[17]
    t80    = row[19]
    t63    = row[20]
    mc     = row[22]

    if blank and isinstance(blank, (int, float)) and blank > 0:
        press_machines = []
        if t320 and isinstance(t320, (int, float)) and t320 > 0: press_machines.append('320T')
        if t200 and isinstance(t200, (int, float)) and t200 > 0: press_machines.append('200T')
        if t160 and isinstance(t160, (int, float)) and t160 > 0: press_machines.append('160T')
        if t110 and isinstance(t110, (int, float)) and t110 > 0: press_machines.append('110T')
        if t80  and isinstance(t80,  (int, float)) and t80  > 0: press_machines.append('80T')
        if t63  and isinstance(t63,  (int, float)) and t63  > 0: press_machines.append('63T')

        print(f"  SAP: {sap:<35}  Blanking={blank}  Press machines: {press_machines}  M/C col: {mc}")
        count += 1
        if not press_machines:
            only_blanking += 1

print(f"\nTotal parts with Blanking: {count}")
print(f"Parts with ONLY Blanking (no press machine): {only_blanking}")
