import { Camera, Lightbulb, Mail, ScanSearch, ShieldCheck } from "lucide-react";
import { EnvioForm } from "@/components/EnvioForm";
import { HeroIlustracao } from "@/components/HeroIlustracao";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { site } from "@/lib/site";

const passos = [
  {
    icone: Camera,
    titulo: "Envie sua foto",
    texto: "Informe seu e-mail e envie a foto da multidão. É gratuito.",
  },
  {
    icone: ScanSearch,
    titulo: "Nós analisamos",
    texto:
      "Um modelo de inteligência artificial marca um ponto em cada cabeça, e a equipe Aglo revisa o resultado.",
  },
  {
    icone: Mail,
    titulo: "Receba no e-mail",
    texto: `Em ${site.prazoResposta}, você recebe a estimativa e a imagem com cada pessoa marcada.`,
  },
];

const dicas = [
  "Use a foto original, na maior resolução que tiver.",
  "Fotos tiradas do alto (drone, prédio, palco) funcionam melhor.",
  "Evite árvores, toldos ou sombras cobrindo as pessoas.",
  "Uma foto por envio. Para várias fotos, envie uma de cada vez.",
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 md:grid-cols-2 md:py-20">
          <div className="flex flex-col gap-5">
            <span className="w-fit rounded-full bg-[#E6EFF8] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#137FEC]">
              Contagem de multidões com IA
            </span>
            <h1 className="text-4xl font-bold leading-tight text-slate-900 md:text-5xl">
              Quantas pessoas tem na sua foto?
            </h1>
            <p className="text-lg text-slate-600">
              Envie uma foto de multidão e receba no seu e-mail a contagem estimada, com cada pessoa
              marcada na imagem. Sem custo.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="#enviar"
                className="rounded-lg bg-[#137FEC] px-6 py-3 font-semibold text-white hover:bg-[#0F6FD1]"
              >
                Enviar minha foto
              </a>
              <a
                href="#como-funciona"
                className="rounded-lg border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Como funciona
              </a>
            </div>
          </div>

          <HeroIlustracao />
        </section>

        <section id="como-funciona" className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-5 py-14">
            <h2 className="text-2xl font-bold text-slate-900">Como funciona</h2>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {passos.map(({ icone: Icone, titulo, texto }, indice) => (
                <div key={titulo} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#E6EFF8] text-[#137FEC]">
                      <Icone size={22} />
                    </div>
                    <span className="text-sm font-semibold text-slate-400">Passo {indice + 1}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">{titulo}</h3>
                  <p className="text-sm text-slate-600">{texto}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="enviar" className="mx-auto grid max-w-6xl scroll-mt-6 gap-8 px-5 py-14 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Envie sua foto</h2>
              <p className="text-slate-600">
                Campos com <span className="text-[#137FEC]">*</span> são obrigatórios.
              </p>
            </div>
            <EnvioForm />
          </div>

          <aside className="flex flex-col gap-6 lg:pt-16">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-center gap-2 font-semibold text-amber-900">
                <Lightbulb size={18} />
                Dicas para uma boa contagem
              </div>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-amber-900/90">
                {dicas.map((dica) => (
                  <li key={dica}>{dica}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2 font-semibold text-slate-900">
                <ShieldCheck size={18} className="text-emerald-600" />
                Sua privacidade
              </div>
              <p className="mt-3 text-sm text-slate-600">
                Usamos seu e-mail só para enviar o resultado. A foto é apagada em até{" "}
                {site.diasRetencaoFoto} dias após a resposta e só é publicada com a sua autorização.
              </p>
              <a href="/privacidade" className="mt-3 inline-block text-sm text-[#137FEC] hover:underline">
                Ler a política de privacidade
              </a>
            </div>
          </aside>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
