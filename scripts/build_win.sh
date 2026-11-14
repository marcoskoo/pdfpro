#!/bin/bash
# Compila PDFPro para Windows (instalador NSIS + portable) desde Linux
set -e
cd /home/z/my-project/pdfpro-desktop
export CSC_IDENTITY_AUTO_DISCOVERY=false
# wine portable (Kron4ek 11.21) para generar el desinstalador NSIS
# (v2.9.22: dentro de my-project/tools — tras el reciclado del sandbox)
export ELECTRON_BUILDER_WINE_TOOLSET_DIR=/home/z/my-project/tools/wine-11.21-amd64
export DISPLAY=:99
export WINEDEBUG=-all
echo "== compilando en $(pwd) con wine $ELECTRON_BUILDER_WINE_TOOLSET_DIR =="
npx electron-builder --win nsis portable --x64
echo "== artefactos =="
ls -la dist/
