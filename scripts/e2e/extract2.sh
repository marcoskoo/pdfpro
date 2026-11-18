#!/bin/bash
TOTAL=$(agent-browser eval 'window._outB64.length' | tr -d '"')
echo "total: $TOTAL"
> /home/z/my-project/scripts/e2e/saved.b64
POS=0
while [ $POS -lt $TOTAL ]; do
  CHUNK=$(agent-browser eval "window._outB64.slice($POS,$((POS+18000)))")
  printf '%s' "$CHUNK" >> /home/z/my-project/scripts/e2e/saved.b64
  POS=$((POS+18000))
done
wc -c /home/z/my-project/scripts/e2e/saved.b64
