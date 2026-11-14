#!/bin/bash
# ═══ Publica el Release v2.9.21 en GitHub (marcoskoo/pdfpro) ═══
# 1) crea el release con las notas de scripts/release_notes_2921.txt
# 2) sube los 4 activos de la auto-actualización (electron-updater):
#    Setup.exe · Portable.exe · Setup.exe.blockmap · latest.yml
# 3) verifica: lista los activos y descarga latest.yml comparando hash
set -euo pipefail
cd /home/z/my-project
set -a; source .env; set +a

REPO="marcoskoo/pdfpro"
TAG="v2.9.21"
TITLE="PDFPro 2.9.21 — Matrícula del casillero 7 primero (Doc 4444); corrige «FLIGHT/FLIGT»"

# 1) crear el release (payload JSON con el cuerpo de las notas)
python3 - "$TITLE" <<'PYEOF' > /tmp/release_payload.json
import json, sys
body = open('/home/z/my-project/scripts/release_notes_2921.txt', encoding='utf-8').read()
print(json.dumps({"tag_name": "v2.9.21", "target_commitish": "main",
                  "name": sys.argv[1], "body": body,
                  "draft": False, "prerelease": False}))
PYEOF
RESP=$(curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -d @/tmp/release_payload.json \
  "https://api.github.com/repos/$REPO/releases")
REL_ID=$(echo "$RESP" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('id') or ('ERROR: '+str(d.get('message'))))")
echo "release id: $REL_ID"
case "$REL_ID" in ERROR*) echo "$RESP"; exit 1;; esac

# 2) subir los activos (octet-stream; ignora 422 «ya existe» por si se re-ejecuta)
upload() {
  local f="$1" ct="$2"
  echo "→ subiendo $(basename "$f") ($(du -h "$f" | cut -f1))…"
  curl -s -X POST \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Content-Type: $ct" \
    --data-binary @"$f" \
    "https://uploads.github.com/repos/$REPO/releases/$REL_ID/assets?name=$(basename "$f")" \
    | python3 -c "import json,sys; d=json.load(sys.stdin); print('   ✓', d.get('name'), d.get('state'), d.get('size'), 'bytes') if d.get('state') else print('   ✗', d.get('message'))"
}
upload download/PDFPro-Setup-2.9.21.exe        application/octet-stream
upload download/PDFPro-Portable-2.9.21.exe     application/octet-stream
upload download/PDFPro-Setup-2.9.21.exe.blockmap application/octet-stream
upload download/latest.yml                     application/octet-stream

# 3) verificación: activos publicados y latest.yml íntegro
echo "── verificación ──"
curl -s -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/$REPO/releases/tags/$TAG" \
  | python3 -c "
import json, sys
d = json.load(sys.stdin)
print('release:', d.get('name'), '| tag:', d.get('tag_name'), '|', d.get('html_url'))
for a in d.get('assets', []):
    print('  activo:', a['name'], '·', a['size'], 'bytes ·', a['state'])
"
curl -sL "https://github.com/$REPO/releases/download/$TAG/latest.yml" -o /tmp/latest_downloaded.yml
if diff -q /tmp/latest_downloaded.yml download/latest.yml >/dev/null; then
  echo "latest.yml descargado del release = local ✓ (electron-updater lo verá)"
else
  echo "✗ latest.yml difiere del local"; exit 1
fi
echo "TODO OK"
