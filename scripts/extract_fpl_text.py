#!/usr/bin/env python3
"""Extrae la capa de texto de los FPL reales subidos por el usuario
para entender la estructura de los 'FlightPlan ....pdf'."""
import sys, re

def extraer(path):
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(path)
        for i, page in enumerate(doc):
            if i > 1:
                break
            print(f"── página {i+1} de {path} ──")
            print(page.get_text("text"))
        doc.close()
        return
    except ImportError:
        pass
    # fallback: pdftotext
    import subprocess
    out = subprocess.run(["pdftotext", "-layout", path, "-"],
                         capture_output=True, text=True)
    print(out.stdout[:4000])
    if out.stderr:
        print("STDERR:", out.stderr[:300])

if __name__ == "__main__":
    for p in sys.argv[1:]:
        print("═" * 60)
        print("ARCHIVO:", p)
        print("═" * 60)
        extraer(p)
