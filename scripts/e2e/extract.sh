#!/bin/bash
# extrae window._outB64 por fragmentos a un archivo
> /home/z/my-project/scripts/e2e/saved.b64
for i in $(seq 0 60); do
  START=$((i*20000))
  LEN=$(agent-browser eval "window._outB64.length>$START ? (window._outB64.slice($START,$((START+20000)))) : \"END\"" 2>/dev/null)
  case "$LEN" in
    *END*|END) break;;
  esac
  printf '%s' "$LEN" >> /home/z/my-project/scripts/e2e/saved.b64
done
wc -c /home/z/my-project/scripts/e2e/saved.b64
