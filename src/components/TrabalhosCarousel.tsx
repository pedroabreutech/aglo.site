"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin, Play } from "lucide-react";

const trabalhos = [
  {
    titulo: "Museu da República",
    local: "Brasília",
    video: "/trabalhos/museu-da-republica.mp4",
  },
  {
    titulo: "Praça Tamandaré",
    local: "Contagem em vídeo",
    video: "/trabalhos/praca-tamandare.mp4",
  },
  {
    titulo: "Avenida Paulista",
    local: "São Paulo",
    video: "/trabalhos/avenida-paulista.mp4",
  },
];

export function TrabalhosCarousel() {
  const [ativo, setAtivo] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const trabalho = trabalhos[ativo];

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.load();
    void video.play().catch(() => undefined);
  }, [ativo]);

  function navegar(direcao: number) {
    setAtivo((atual) => (atual + direcao + trabalhos.length) % trabalhos.length);
  }

  return (
    <section id="trabalhos" className="overflow-hidden bg-slate-950 text-white">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 lg:grid-cols-[0.8fr_1.2fr] lg:py-20">
        <div className="flex flex-col items-start gap-5">
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-300">
            Trabalhos realizados
          </span>
          <h2 className="max-w-lg text-3xl font-bold leading-tight md:text-4xl">
            A multidão em movimento, contada quadro a quadro.
          </h2>
          <p className="max-w-lg text-base leading-relaxed text-slate-300">
            O Aglo também processa vídeos e transforma cenas de grandes eventos em análises visuais
            claras. Veja alguns trabalhos já realizados.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navegar(-1)}
              aria-label="Trabalho anterior"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/5 transition hover:bg-white/15"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              onClick={() => navegar(1)}
              aria-label="Próximo trabalho"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/5 transition hover:bg-white/15"
            >
              <ChevronRight size={22} />
            </button>
            <span className="ml-2 text-sm tabular-nums text-slate-400">
              {String(ativo + 1).padStart(2, "0")} / {String(trabalhos.length).padStart(2, "0")}
            </span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-3xl">
          <div className="absolute -inset-8 rounded-[3rem] bg-[#137FEC]/20 blur-3xl" aria-hidden="true" />
          <article className="relative overflow-hidden rounded-3xl border border-white/15 bg-slate-900 shadow-2xl shadow-black/40">
            <div className="grid items-stretch sm:grid-cols-[minmax(0,1fr)_190px]">
              <div className="relative flex min-h-[460px] items-center justify-center bg-black sm:min-h-[560px]">
                <video
                  ref={videoRef}
                  key={trabalho.video}
                  aria-label={`Trabalho realizado: ${trabalho.titulo}`}
                  className="absolute inset-0 h-full w-full object-contain"
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls
                  preload="metadata"
                >
                  <source src={trabalho.video} type="video/mp4" />
                  Seu navegador não conseguiu reproduzir este vídeo.
                </video>
              </div>
              <div className="flex flex-col justify-between gap-8 border-t border-white/10 p-6 sm:border-l sm:border-t-0">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#137FEC] text-white">
                  <Play size={18} fill="currentColor" />
                </div>
                <div aria-live="polite">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-sky-300">
                    <MapPin size={14} />
                    {trabalho.local}
                  </p>
                  <h3 className="text-xl font-semibold text-white">{trabalho.titulo}</h3>
                  <div className="mt-5 flex gap-2" aria-label="Selecionar trabalho">
                    {trabalhos.map((item, indice) => (
                      <button
                        key={item.titulo}
                        type="button"
                        onClick={() => setAtivo(indice)}
                        aria-label={`Ver ${item.titulo}`}
                        aria-current={indice === ativo ? "true" : undefined}
                        className={`h-1.5 rounded-full transition-all ${
                          indice === ativo ? "w-8 bg-[#137FEC]" : "w-4 bg-white/25 hover:bg-white/50"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
