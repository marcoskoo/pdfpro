#!/bin/bash
# Compila SOLO el objetivo portable de PDFPro para Windows (el NSIS/Setup
# ya está compilado) — útil cuando el portable falló por una condición
# transitoria (p. ej. OOM del 7za -mx=9 con poca RAM disponible: liberar
# memoria cerrando el dev server y el navegador de las pruebas, o tras un
# reciclado del sandbox que vació ~/.cache y re-descargó las herramientas).
set -e
cd /home/z/my-project/pdfpro-desktop
export CSC_IDENTITY_AUTO_DISCOVERY=false
# wine portable (Kron4ek 11.21) para generar el desinstalador NSIS
export ELECTRON_BUILDER_WINE_TOOLSET_DIR=/home/z/my-project/tools/wine-11.21-amd64
export DISPLAY=:99
export WINEDEBUG=-all
echo "== portable-only en $(pwd) =="
npx electron-builder --win portable --x64
echo "== artefactos =="
ls -la dist/PDFPro-*2.9.30*
