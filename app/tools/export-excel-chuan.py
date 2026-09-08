#!/usr/bin/env python3
# Xuat data/goicuoc-vnpt-full.json ra data/vienthong-chuan.xlsx (7 sheets).
# Chay tu thu muc app/: python3 tools/export-excel-chuan.py
import json
import pathlib
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
DATA_PATH = ROOT / 'data' / 'goicuoc-vnpt-full.json'
OUT_PATH = ROOT / 'data' / 'vienthong-chuan.xlsx'

BASE_HEADERS = [
    'A Tên gói *', 'B Slug', 'C Danh mục slug *', 'D Giá (VNĐ) *',
    'E Giá gốc', 'F Chu kỳ', 'G Đơn vị', 'H Mô tả ngắn (card ≤600) *',
    'I Mô tả chi tiết (HTML)', 'J Chú thích chi tiết', 'K Ảnh (file/link)',
    'L Nổi bật', 'M Thứ tự', 'N Còn hàng',
]
WIDTHS = [26, 24, 20, 13, 12, 10, 9, 34, 40, 30, 16, 9, 8, 9]

HEADER_FILL = PatternFill(start_color='1565C0', end_color='1565C0', fill_type='solid')
HEADER_FONT = Font(color='FFFFFF', bold=True, size=10, name='Calibri')
EXAMPLE_FILL = PatternFill(start_color='FFFDE7', end_color='FFFDE7', fill_type='solid')
TITLE_FONT = Font(color='0D47A1', bold=True, size=12, name='Calibri')
BORDER = Border(*[Side(style='thin', color='E2E8F0') for _ in range(4)])
CENTER = Alignment(horizontal='center', vertical='center', wrap_text=True)
LEFT = Alignment(horizontal='left', vertical='center', wrap_text=True)

CATS = ['internet-wifi-mesh', 'internet-truyen-hinh-combo', 'internet-di-dong',
        'internet-camera', 'truyen-hinh-mytv', 'goi-cuoc-4g', 'goi-cuoc-thoai',
        'combo-thoai-data', 'sim-so', 'goi-ung-dung', 'chuyen-vung-quoc-te',
        'home-internet', 'home-mesh', 'home-tv', 'home-sanh', 'home-cam',
        'dich-vu-so', 'kaspersky', 'vnpt-camera', 'vnpt-wifi-mesh', 'familysafe']

CYCLES = 'daily,weekly,monthly,1m,3m,6m,12m,other'


def fmt(v):
    return f'{v:,}'.replace(',', '.') + 'đ'


def sheet(ws, title, headers, rows, note=''):
    ws.sheet_properties.tabColor = '1565C0'
    ws.merge_cells('A1:N1')
    c = ws['A1']
    c.value = title
    c.font = TITLE_FONT
    c.alignment = Alignment(horizontal='center', vertical='center')
    ws.row_dimensions[1].height = 26
    if note:
        ws.merge_cells('A2:N2')
        n = ws['A2']
        n.value = note
        n.font = Font(color='64748B', size=9, italic=True, name='Calibri')
        n.alignment = Alignment(horizontal='left', vertical='center', wrap_text=True)
        ws.row_dimensions[2].height = 30
    hr = 3 if note else 2
    for i, h in enumerate(headers, 1):
        cell = ws.cell(row=hr, column=i, value=h)
        cell.font = HEADER_FONT
        cell.fill = HEADER_FILL
        cell.alignment = CENTER
        cell.border = BORDER
    ws.row_dimensions[hr].height = 34
    for i, w in enumerate(WIDTHS[:len(headers)], 1):
        from openpyxl.utils import get_column_letter
        ws.column_dimensions[get_column_letter(i)].width = w
    dv_cat = DataValidation(type='list', formula1='"' + ','.join(CATS) + '"', allow_blank=True)
    ws.add_data_validation(dv_cat)
    dv_cyc = DataValidation(type='list', formula1=f'"{CYCLES}"', allow_blank=True)
    ws.add_data_validation(dv_cyc)
    dv_bool = DataValidation(type='list', formula1='"TRUE,FALSE"', allow_blank=True)
    ws.add_data_validation(dv_bool)
    r0 = hr + 1
    for r, row in enumerate(rows, r0):
        for i, v in enumerate(row, 1):
            cell = ws.cell(row=r, column=i, value=v)
            cell.font = Font(size=10, name='Calibri')
            cell.border = BORDER
            cell.alignment = LEFT if i in (1, 8, 9, 10) else CENTER
        ws.row_dimensions[r].height = 44
    col_f = headers.index('F Chu kỳ') + 1 if 'F Chu kỳ' in headers else 6
    col_l = headers.index('L Nổi bật') + 1 if 'L Nổi bật' in headers else 12
    col_n = headers.index('N Còn hàng') + 1 if 'N Còn hàng' in headers else 14
    col_c = 3
    from openpyxl.utils import get_column_letter
    dv_cat.add(f'{get_column_letter(col_c)}{r0}:{get_column_letter(col_c)}{r0 + max(len(rows), 50)}')
    dv_cyc.add(f'{get_column_letter(col_f)}{r0}:{get_column_letter(col_f)}{r0 + max(len(rows), 50)}')
    dv_bool.add(f'{get_column_letter(col_l)}{r0}:{get_column_letter(col_l)}{r0 + max(len(rows), 50)}')
    dv_bool.add(f'{get_column_letter(col_n)}{r0}:{get_column_letter(col_n)}{r0 + max(len(rows), 50)}')
    ws.freeze_panes = f'A{r0}'
    return r0


def home_rows(items, cat_map):
    rows = []
    for g in items:
        g1 = g['g'].get('1 tháng', 0)
        specs = '; '.join(f'{k}: {v}' for k, v in list(g.get('tp', {}).items())[:2])
        short = f"{g.get('md', '')}. {specs}. Giá {fmt(g1)}/tháng (đã VAT).".strip()[:600]
        detail = ' | '.join(f'{k}: {v}' for k, v in g['g'].items())
        note = f"Nhóm: {g.get('nh', '')}. Bảng giá chu kỳ: {detail}"
        rows.append([
            g['n'], '', cat_map.get(g['n'], ''), g1, '', 'monthly', '/tháng',
            short, '', note, '', 'TRUE' if g.get('nh', '').startswith('★') else 'FALSE',
            0, 'TRUE', g.get('nh', ''),
            json.dumps(g.get('tp', {}), ensure_ascii=False),
            json.dumps(g['g'], ensure_ascii=False), 'DATA.goi',
        ])
    return rows


def main():
    data = json.loads(DATA_PATH.read_text(encoding='utf-8'))
    wb = openpyxl.Workbook()

    extra = ['O Nhóm (nh)', 'P Thông số (tp JSON)', 'Q Bảng giá chu kỳ (g JSON)', 'R Nguồn']
    H = BASE_HEADERS + extra

    # Sheet 1: Home (35 goi)
    home_cat = {}
    for g in data['DATA']['goi']:
        n = g['n']
        if 'Mesh' in n and 'HomeTV' in n.replace(' ', '') or n.startswith('HomeTV'):
            home_cat[n] = 'home-tv'
        elif 'Mesh' in n:
            home_cat[n] = 'home-mesh'
        elif 'Cam' in n or 'SÀNH' in n or 'ĐỈNH' in n:
            home_cat[n] = 'home-cam' if 'Cam' in n else ('home-sanh' if 'SÀNH' in n or 'ĐỈNH' in n else 'home-internet')
        else:
            home_cat[n] = 'home-internet'
    # Tune: HomeTV_* -> home-tv, Home Cam * -> home-cam, HOME SÀNH/ĐỈNH -> home-sanh
    for g in data['DATA']['goi']:
        n = g['n']
        un = n.replace(' ', '').upper()
        if un.startswith('HOMETV'):
            home_cat[n] = 'home-tv'
        elif 'CAM' in un:
            home_cat[n] = 'home-cam'
        elif 'SÀNH' in n or 'ĐỈNH' in n:
            home_cat[n] = 'home-sanh'
    ws = wb.active
    ws.title = 'Home'
    rows = home_rows(data['DATA']['goi'], home_cat)
    # append R Nguon
    rows = [r[:-1] + [r[-1], 'DATA.goi'] for r in rows]
    sheet(ws, 'HOME — 35 gói Internet/TV/Cam (Nga Sơn)', H, rows,
          'Giá đã VAT. Cột Q giữ JSON bảng giá gốc để importer render bảng chu kỳ. Hàng vàng là ví dụ mẫu.')

    # Sheet 2: DiDong_Combo (45)
    ws2 = wb.create_sheet('DiDong_Combo')
    rows2 = []
    for g in data['DD']['goi']:
        g1 = g['g'].get('1', 0)
        q = g.get('q', {})
        specs = '; '.join(f'{k}: {v}' for k, v in list(q.items())[:2])
        short = f"{specs}. Giá {fmt(g1)}/tháng.".strip()[:600]
        note = f"Đối tượng: {g.get('dt', '')}. Họ: {g.get('ho', '')}"
        rows2.append([
            g['n'], '', 'goi-cuoc-4g', g1, '', 'monthly', '/tháng', short, '', note,
            '', 'FALSE', 0, 'TRUE', g.get('ho', ''),
            json.dumps(q, ensure_ascii=False),
            json.dumps(g['g'], ensure_ascii=False), 'DD.goi|' + g.get('dt', ''),
        ])
    sheet(ws2, 'DI ĐỘNG COMBO — 45 gói (VD/YOLO/SODA...)', H, rows2)

    # Sheet 3: DiDong_Le (23)
    ws3 = wb.create_sheet('DiDong_Le')
    rows3 = []
    for g in data['DD']['le']:
        rows3.append([
            g['n'], '', 'goi-cuoc-4g', g['gia'], '', 'monthly', '/tháng',
            f"{g.get('nd', '')} Giá {fmt(g['gia'])}/{g.get('ck', '')}.".strip()[:600],
            '', f"Loại: {g.get('loai', '')}. Chu kỳ gốc: {g.get('ck', '')}", '',
            'FALSE', 0, 'TRUE', g.get('loai', ''), '{}',
            json.dumps({'ck': g.get('ck', '')}, ensure_ascii=False), 'DD.le',
        ])
    sheet(ws3, 'DI ĐỘNG LẺ — 23 gói (H5/D5/D6V...)', H, rows3)

    # Sheet 4: MyTV (6 + 7 addon)
    ws4 = wb.create_sheet('MyTV')
    rows4 = []
    for m in data['DATA']['mytv']:
        g1 = m['gia'].get('Hàng tháng', 0)
        rows4.append([
            m['ten'], '', 'truyen-hinh-mytv', g1, '', 'monthly', '/tháng',
            f"{m['mota']} Giá {fmt(g1)}/tháng.".strip()[:600], '',
            'Bảng giá: ' + ' | '.join(f'{k}: {fmt(v)}' for k, v in m['gia'].items()),
            '', 'FALSE', 0, 'TRUE', 'MyTV',
            '{}', json.dumps(m['gia'], ensure_ascii=False), 'DATA.mytv',
        ])
    for a in data['DATA']['addon']:
        rows4.append([
            f"{a['ten']} — MyTV", '', 'truyen-hinh-mytv', a['gia'], '', 'monthly', '/tháng',
            f"{a['mota']} Giá {fmt(a['gia'])}/tháng.".strip()[:600], '', 'Gói bổ sung MyTV', '',
            'FALSE', 0, 'TRUE', 'MyTV bổ sung', '{}', '{}', 'DATA.addon',
        ])
    sheet(ws4, 'MYTV — 6 gói + 7 bổ sung', H, rows4)

    # Sheet 5: Camera (6 campack + 2 camthe + 3 TTN)
    ws5 = wb.create_sheet('Camera')
    rows5 = []
    for c in data['DATA']['campack']:
        g1 = c['gia'].get('Hàng tháng', 0)
        rows5.append([
            f"{c['ten']} — Camera + Cloud", '', 'internet-camera', g1, '', 'monthly', '/tháng',
            f"{c['nd']}. Giá {fmt(g1)}/tháng.".strip()[:600], '',
            'Bảng giá: ' + ' | '.join(f'{k}: {fmt(v)}' for k, v in c['gia'].items()),
            '', 'FALSE', 0, 'TRUE', 'Camera + Cloud',
            '{}', json.dumps(c['gia'], ensure_ascii=False), 'DATA.campack',
        ])
    for c in data['DATA']['camthe']:
        rows5.append([
            f"{c['ten']} — Camera + thẻ nhớ", '', 'internet-camera', c['gia'], '', 'monthly', '/tháng',
            f"{c['cam']} + {c['the']}. Giá {fmt(c['gia'])}/tháng.".strip()[:600], '', '', '',
            'FALSE', 0, 'TRUE', 'Camera + thẻ nhớ', '{}', '{}', 'DATA.camthe',
        ])
    for t in data.get('TTN', []):
        rows5.append([
            f"{t['n']} (TTN mới 01/9)", '', 'internet-camera', t.get('thue', 0), t.get('gia', 0),
            'monthly', '/tháng', f"{t.get('nd', '')} Thuê {fmt(t.get('thue', 0))}/tháng.".strip()[:600], '',
            f"Giá mua: {fmt(t.get('gia', 0))}; giá cũ: {fmt(t.get('cu', 0))}. {t.get('dk', '')}",
            '', 'TRUE', 0, 'TRUE', t.get('nhan', ''),
            '{}', '{}', 'TTN|' + json.dumps(t, ensure_ascii=False),
        ])
    sheet(ws5, 'CAMERA — thuê Cloud + TTN mới 01/9', H, rows5)

    # Sheet 6: ThietBi tham khao
    ws6 = wb.create_sheet('ThietBi_TK')
    rows6 = []
    for m in data['DATA']['mesh5']:
        rows6.append([
            f"{m['ten']} (Mesh 5)", '', 'internet-wifi-mesh', m['gia'].get('Hàng tháng', 0), '',
            'monthly', '/tháng', f"{m['nd']}.".strip()[:600], '', 'Tham khảo — inStock=FALSE', '',
            'FALSE', 0, 'FALSE', 'Mesh 5', '{}',
            json.dumps(m['gia'], ensure_ascii=False), 'DATA.mesh5',
        ])
    for cl in data['DATA']['cloud']:
        rows6.append([
            f"{cl['ten']} (Cloud)", '', 'internet-camera', cl.get('indoor', 0), '', 'monthly', '/tháng',
            f"Cloud Indoor {fmt(cl.get('indoor', 0))} / Outdoor {fmt(cl.get('outdoor', 0))}.".strip()[:600],
            '', 'Tham khảo — inStock=FALSE', '', 'FALSE', 0, 'FALSE', 'Cloud',
            '{}', '{}', 'DATA.cloud',
        ])
    sheet(ws6, 'THIẾT BỊ tham khảo (không bán lẻ)', H, rows6)

    # Sheet 7: Huong dan
    ws7 = wb.create_sheet('Huong dan')
    ws7['A1'] = 'HƯỚNG DẪN CẬP NHẬT — sửa đúng sheet → chạy tools/sync-goicuoc.ts --dry duyệt → chạy thật'
    ws7['A1'].font = TITLE_FONT
    guide = [
        'Home: 35 gói Internet/TV/Cam — sửa giá 1 tháng (cột D), bảng chu kỳ giữ ở cột Q.',
        'DiDong_Combo: 45 gói — thêm cột R Đối tượng khi đổi chính sách.',
        'DiDong_Le: 23 gói — chu kỳ lẻ (2h/24h/7 ngày) giữ ở cột S, importer tự map daily/weekly/monthly.',
        'MyTV/Camera: sửa giá Hàng tháng, addon/the-cam gộp chung sheet.',
        'ThietBi_TK: chỉ tham khảo (N=FALSE), không hiện lên web.',
        'Slug (B) để trống sẽ tự sinh; trùng slug = UPDATE, mới = CREATE.',
    ]
    for i, g in enumerate(guide, 3):
        ws7.cell(row=i, column=1, value=f'{i - 2}) {g}').font = Font(size=10, name='Calibri')
        ws7.row_dimensions[i].height = 26
    ws7.column_dimensions['A'].width = 130

    wb.save(OUT_PATH)
    print(f'saved {OUT_PATH}')


if __name__ == '__main__':
    import json
    main()
