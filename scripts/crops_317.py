# Recortes de la captura 1920x1080 para análisis con VLM
from PIL import Image

im = Image.open('/home/z/my-project/upload/pasted_image_1794976464784.png').convert('RGB')

# 1) Panel derecho completo (media derecha), mitad vertical: ficha del sello
c1 = im.crop((1380, 300, 1920, 720)).resize((1620, 1260), Image.LANCZOS)
c1.save('/tmp/crop_ficha.png')

# 2) Zona del FPL: casilleros 7/8/13 (aeródromo salida + EOBT) — banda superior del formulario
c2 = im.crop((240, 150, 1380, 640)).resize((1710, 740), Image.LANCZOS)
c2.save('/tmp/crop_fpl.png')

print('OK', c1.size, c2.size)
