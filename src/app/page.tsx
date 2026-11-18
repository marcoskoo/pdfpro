'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * PDFPro v2.9.8 — CORPAC AIS/ARO SPHI
 *
 * La aplicación completa (editor PDF/Word/Excel, sellos, OCR, decodificador
 * aeronáutico) vive en /pdfpro/index.html como app estática. Se sirve embebida
 * en un iframe a pantalla completa desde la ruta raíz.
 */
export default function Home() {
  const [loading, setLoading] = useState(true)
  const frameRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    // El iframe es same-origin: ocultamos el cargador cuando la app termina de pintar.
    const t = setTimeout(() => setLoading(false), 4000)
    const onLoad = () => {
      setLoading(false)
      clearTimeout(t)
    }
    const frame = frameRef.current
    if (frame) {
      frame.addEventListener('load', onLoad, { once: true })
    }
    return () => clearTimeout(t)
  }, [])

  return (
    <main className="fixed inset-0 flex flex-col bg-background">
      {loading && (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-background">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" aria-hidden="true" />
          <p className="text-sm text-muted-foreground" role="status">
            Cargando PDFPro v2.9.8…
          </p>
        </div>
      )}
      <iframe
        ref={frameRef}
        src="/pdfpro/index.html"
        title="PDFPro — PDF Editor Pro · CORPAC AIS/ARO SPHI"
        className="h-full w-full flex-1 border-0"
        allow="clipboard-read; clipboard-write; fullscreen"
        onError={() => setLoading(false)}
      />
    </main>
  )
}
