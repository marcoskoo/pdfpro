#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Análisis del PDF exportado por la app: rects/lines (colores, grosor), texto superpuesto."""
import pdfplumber, collections

PDF = "/home/z/my-project/upload/ATC CM468  11NOV (1).pdf"

with pdfplumber.open(PDF) as pdf:
    print("páginas:", len(pdf.pages))
    for pi, page in enumerate(pdf.pages):
        print(f"\n== PÁGINA {pi+1} :: {page.width:.1f} x {page.height:.1f} pts, rot={page.rotation}")
        rects = page.rects
        lines = page.lines
        print(f"  rects={len(rects)} lines={len(lines)} curves={len(page.curves)} images={len(page.images)} chars={len(page.chars)}")
        # clasificar rects
        cnt = collections.Counter()
        for r in rects:
            key = (r.get('stroke'), r.get('fill'), r.get('scolor') or r.get('non_stroking_color'), r.get('ncs'), round(r.get('linewidth') or 0, 2))
            cnt[key] += 1
        for k, v in cnt.most_common(12):
            print(f"    rect stroke={k[0]} fill={k[1]} stroke_color={k[2]} ncs={k[3]} lw={k[4]} x{v}")
        cntl = collections.Counter()
        for l in lines:
            key = (l.get('stroking_color'), round(l.get('linewidth') or 0, 2))
            cntl[key] += 1
        for k, v in cntl.most_common(12):
            print(f"    line color={k[0]} lw={k[1]} x{v}")
        # primeros 6 rects detalle
        for r in rects[:6]:
            print(f"    rect x0={r['x0']:.1f} y0={r['top']:.1f} w={r['width']:.1f} h={r['height']:.1f} stroke={r.get('stroke')} scolor={r.get('stroking_color')} fill={r.get('fill')} fcolor={r.get('non_stroking_color')} lw={r.get('linewidth')}")
        # imágenes
        for im in page.images:
            print(f"    image x0={im['x0']:.1f} top={im['top']:.1f} w={im['width']:.1f} h={im['height']:.1f} name={im.get('name')}")
        # texto: palabras y buscar superposición de caracteres
        words = page.extract_words(use_text_flow=False, keep_blank_chars=False)
        print(f"  palabras={len(words)}")
        # caracteres superpuestos: mismo baseline, solape horizontal > 30%
        chars = page.chars
        byrow = collections.defaultdict(list)
        for ch in chars:
            byrow[round(ch['top'])].append(ch)
        overl = 0
        samples = []
        for top, chs in byrow.items():
            chs.sort(key=lambda c: c['x0'])
            for a, b in zip(chs, chs[1:]):
                ov = min(a['x1'], b['x1']) - max(a['x0'], b['x0'])
                if ov > 0.3 * min(a['x1']-a['x0'], b['x1']-b['x0']):
                    overl += 1
                    if len(samples) < 25:
                        samples.append(f"top={top} '{a['text']}'(x{a['x0']:.1f}-{a['x1']:.1f},sz{a['size']:.1f}) vs '{b['text']}'(x{b['x0']:.1f}-{b['x1']:.1f},sz{b['size']:.1f})")
        print(f"  pares de caracteres SOLAPADOS: {overl}")
        for s in samples:
            print("    ", s)
        # fuentes usadas
        fonts = collections.Counter(c.get('fontname') for c in chars)
        print("  fuentes:", dict(fonts.most_common(8)))
        # texto de las primeras líneas (top 30) para ver encabezados
        words_sorted = sorted(words, key=lambda w: (round(w['top']), w['x0']))
        rows = collections.defaultdict(list)
        for w in words_sorted:
            rows[round(w['top']/3)*3].append(w['text'])
        keys = sorted(rows)
        print("  --- primeras 14 filas de texto ---")
        for k in keys[:14]:
            print(f"    top~{k}: {' '.join(rows[k])[:150]}")
        if len(pdf.pages) > 1 and pi == 0:
            continue
