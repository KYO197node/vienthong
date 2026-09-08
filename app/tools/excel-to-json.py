#!/usr/bin/env python3
# Doc data/vienthong-chuan.xlsx (7 sheets) -> JSON trung gian cung schema cho sync-goicuoc.ts.
# Chay tu thu muc app/: python3 tools/excel-to-json.py [input.xlsx] [output.json]
import json
import pathlib
import sys

import openpyxl

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
SRC = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'data' / 'vienthong-chuan.xlsx'
OUT = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / 'data' / 'goicuoc-from-excel.json'


def J(v, default):
    if not v:
        return default
    if isinstance(v, dict):
        return v
    try:
        return json.loads(v)
    except Exception:
        return default


def rows(ws):
    header_row = None
    headers = []
    for r in range(1, 6):
        vals = [c.value for c in ws[r]]
        if vals and str(vals[0] or '').startswith('A Tên gói'):
            header_row = r
            headers = vals
            break
    if not header_row:
        return []
    out = []
    for r in ws.iter_rows(min_row=header_row + 1, values_only=True):
        if not r[0]:
            continue
        out.append(dict(zip(headers, r)))
    return out


def boolv(v):
    return str(v or '').upper() == 'TRUE'


def main():
    wb = openpyxl.load_workbook(SRC, data_only=True)
    data = {'goi': [], 'mytv': [], 'campack': [], 'addon': [], 'camthe': [],
            'dd_goi': [], 'dd_le': [], 'ttn': []}

    for r in rows(wb['Home']):
        data['goi'].append({
            'n': r['A Tên gói *'],
            'nh': r.get('O Nhóm (nh)') or '',
            'md': (r.get('H Mô tả ngắn (card ≤600) *') or '').split('. Giá')[0],
            'tp': J(r.get('P Thông số (tp JSON)'), {}),
            'g': J(r.get('Q Bảng giá chu kỳ (g JSON)'), {}),
            '_slug': r.get('B Slug') or '',
            '_cat': r.get('C Danh mục slug *') or '',
            '_featured': boolv(r.get('L Nổi bật')),
            '_instock': str(r.get('N Còn hàng') or '').upper() != 'FALSE',
            '_price': r.get('D Giá (VNĐ) *') or 0,
        })

    for r in rows(wb['DiDong_Combo']):
        g = J(r.get('Q Bảng giá chu kỳ (g JSON)'), {})
        # fallback: chu ky don tu cot F neu Q rong
        data['dd_goi'].append({
            'n': r['A Tên gói *'],
            'q': J(r.get('P Thông số (tp JSON)'), {}),
            'dt': (r.get('R Nguồn') or '').split('|', 1)[1] if '|' in (r.get('R Nguồn') or '') else '',
            'ho': r.get('O Nhóm (nh)') or '',
            'g': g,
            '_slug': r.get('B Slug') or '',
            '_price': r.get('D Giá (VNĐ) *') or 0,
            '_short': r.get('H Mô tả ngắn (card ≤600) *') or '',
            '_note': r.get('J Chú thích chi tiết') or '',
            '_featured': boolv(r.get('L Nổi bật')),
            '_instock': str(r.get('N Còn hàng') or '').upper() != 'FALSE',
        })

    for r in rows(wb['DiDong_Le']):
        q = J(r.get('Q Bảng giá chu kỳ (g JSON)'), {})
        data['dd_le'].append({
            'n': r['A Tên gói *'],
            'gia': r.get('D Giá (VNĐ) *') or 0,
            'ck': q.get('ck', ''),
            'nd': r.get('H Mô tả ngắn (card ≤600) *') or '',
            'loai': r.get('O Nhóm (nh)') or '',
            '_slug': r.get('B Slug') or '',
            '_instock': str(r.get('N Còn hàng') or '').upper() != 'FALSE',
        })

    for r in rows(wb['MyTV']):
        src = r.get('R Nguồn') or ''
        if src == 'DATA.addon':
            data['addon'].append({
                'ten': (r['A Tên gói *'] or '').replace(' — MyTV', ''),
                'gia': r.get('D Giá (VNĐ) *') or 0,
                'mota': r.get('H Mô tả ngắn (card ≤600) *') or '',
            })
        else:
            data['mytv'].append({
                'ten': r['A Tên gói *'],
                'gia': J(r.get('Q Bảng giá chu kỳ (g JSON)'), {'Hàng tháng': r.get('D Giá (VNĐ) *') or 0}),
                'mota': r.get('H Mô tả ngắn (card ≤600) *') or '',
            })

    for r in rows(wb['Camera']):
        src = (r.get('R Nguồn') or '').split('|')[0]
        if src == 'DATA.campack':
            data['campack'].append({
                'ten': (r['A Tên gói *'] or '').replace(' — Camera + Cloud', ''),
                'nd': r.get('H Mô tả ngắn (card ≤600) *') or '',
                'gia': J(r.get('Q Bảng giá chu kỳ (g JSON)'), {'Hàng tháng': r.get('D Giá (VNĐ) *') or 0}),
            })
        elif src == 'DATA.camthe':
            data['camthe'].append({
                'ten': (r['A Tên gói *'] or '').replace(' — Camera + thẻ nhớ', ''),
                'cam': r.get('H Mô tả ngắn (card ≤600) *') or '',
                'the': '',
                'gia': r.get('D Giá (VNĐ) *') or 0,
            })
        elif src == 'TTN':
            raw = (r.get('R Nguồn') or '').split('|', 1)[1]
            t = J(raw, {})
            data['ttn'].append({
                'n': r['A Tên gói *'],
                '_note': r.get('J Chú thích chi tiết') or '',
                '_price': r.get('D Giá (VNĐ) *') or 0,
                '_old': r.get('E Giá gốc') or 0,
                '_short': r.get('H Mô tả ngắn (card ≤600) *') or '',
                '_raw': t,
            })

    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'saved {OUT}')
    for k, v in data.items():
        print(f'  {k}: {len(v)}')


if __name__ == '__main__':
    main()
