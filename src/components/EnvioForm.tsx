"use client";

import { useEffect, useRef, useState, type DragEvent, type FormEvent, type ReactNode } from "react";
import {
  CircleAlert,
  CircleCheck,
  FileUp,
  FileVideo,
  LoaderCircle,
  RefreshCw,
  Send,
} from "lucide-react";
import {
  FORMATOS_VIDEO,
  normalizarInstagram,
  TAMANHO_MAXIMO_VIDEO,
  validarPedido,
  validarPedidoVideo,
} from "@/lib/pedido";
import { prepararImagem, TAMANHO_MAXIMO_ARQUIVO, type ImagemPreparada } from "@/lib/prepararImagem";
import { prepararVideo, type VideoPreparado } from "@/lib/prepararVideo";
import { site } from "@/lib/site";

type Etapa = { tipo: "preenchendo" } | { tipo: "enviando" } | { tipo: "enviado"; protocolo: string };
type Midia = ({ tipo: "imagem" } & ImagemPreparada) | ({ tipo: "video" } & VideoPreparado);

const TAMANHO_PARTE_VIDEO = 2 * 1024 * 1024;
const EXTENSOES_IMAGEM = ["jpg", "jpeg", "png", "webp"];

const camposVazios = {
  nome: "",
  email: "",
  instagram: "",
  evento: "",
  dataEvento: "",
  local: "",
  site: "",
};

type NomeCampo = keyof typeof camposVazios;

const classeInput =
  "w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#137FEC] focus:outline-none focus:ring-2 focus:ring-[#137FEC]/40";

function Campo({
  rotulo,
  obrigatorio,
  dica,
  children,
}: {
  rotulo: string;
  obrigatorio?: boolean;
  dica?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-slate-700">
        {rotulo}
        {obrigatorio ? <span className="text-[#137FEC]"> *</span> : null}
      </span>
      {children}
      {dica ? <span className="text-xs text-slate-500">{dica}</span> : null}
    </label>
  );
}

function Secao({ titulo, descricao, children }: { titulo: string; descricao?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-b border-slate-100 pb-8 last:border-b-0 last:pb-0">
      <div>
        <h3 className="font-semibold text-slate-900">{titulo}</h3>
        {descricao ? <p className="text-sm text-slate-500">{descricao}</p> : null}
      </div>
      {children}
    </section>
  );
}

function extensao(nome: string) {
  return nome.split(".").pop()?.toLowerCase() ?? "";
}

function tamanhoLegivel(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;
}

async function lerResposta(resposta: Response) {
  return (await resposta.json().catch(() => null)) as { protocolo?: string; concluido?: boolean; erro?: string } | null;
}

export function EnvioForm() {
  const [campos, setCampos] = useState(camposVazios);
  const [autorizaAnalise, setAutorizaAnalise] = useState(false);
  const [autorizaPublicacao, setAutorizaPublicacao] = useState(false);
  const [midia, setMidia] = useState<Midia | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [tamanhoArquivo, setTamanhoArquivo] = useState(0);
  const [preparandoMidia, setPreparandoMidia] = useState(false);
  const [progressoEnvio, setProgressoEnvio] = useState(0);
  const [arrastando, setArrastando] = useState(false);
  const [erro, setErro] = useState("");
  const [etapa, setEtapa] = useState<Etapa>({ tipo: "preenchendo" });
  const inputArquivo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (midia) URL.revokeObjectURL(midia.previewUrl);
    };
  }, [midia]);

  function atualizar(campo: NomeCampo, valor: string) {
    setCampos((atuais) => ({ ...atuais, [campo]: valor }));
  }

  async function selecionarArquivo(arquivo: File | undefined) {
    if (!arquivo) return;
    setErro("");
    const formato = extensao(arquivo.name);
    const ehImagem = EXTENSOES_IMAGEM.includes(formato);
    const ehVideo = FORMATOS_VIDEO.includes(formato as (typeof FORMATOS_VIDEO)[number]);

    if (!ehImagem && !ehVideo) {
      setErro("Selecione uma foto JPG, PNG ou WebP, ou um vídeo MP4, MOV, WebM, AVI ou MKV.");
      return;
    }
    if (ehImagem && arquivo.size > TAMANHO_MAXIMO_ARQUIVO) {
      setErro("A foto tem mais de 30 MB. Envie uma versão menor.");
      return;
    }
    if (ehVideo && arquivo.size > TAMANHO_MAXIMO_VIDEO) {
      setErro("O vídeo tem mais de 100 MB. Envie uma versão menor.");
      return;
    }

    setPreparandoMidia(true);
    try {
      const preparada: Midia = ehVideo
        ? { tipo: "video", ...(await prepararVideo(arquivo)) }
        : { tipo: "imagem", ...(await prepararImagem(arquivo)) };
      setMidia(preparada);
      setNomeArquivo(arquivo.name);
      setTamanhoArquivo(arquivo.size);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível abrir este arquivo.");
    } finally {
      setPreparandoMidia(false);
      if (inputArquivo.current) inputArquivo.current.value = "";
    }
  }

  function soltarArquivo(evento: DragEvent<HTMLDivElement>) {
    evento.preventDefault();
    setArrastando(false);
    void selecionarArquivo(evento.dataTransfer.files[0]);
  }

  async function enviarImagem(corpo: Record<string, unknown>) {
    const resposta = await fetch("/api/enviar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    });
    const dados = await lerResposta(resposta);
    if (!resposta.ok || !dados?.protocolo) {
      throw new Error(dados?.erro ?? "Não foi possível enviar agora. Tente novamente em alguns minutos.");
    }
    return dados.protocolo;
  }

  async function enviarVideo(corpo: Record<string, unknown>, video: VideoPreparado) {
    const inicio = await fetch("/api/enviar/video?acao=iniciar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    });
    const dadosInicio = await lerResposta(inicio);
    if (!inicio.ok || !dadosInicio?.protocolo) {
      throw new Error(dadosInicio?.erro ?? "Não foi possível iniciar o envio do vídeo.");
    }

    const protocolo = dadosInicio.protocolo;
    const total = video.arquivo.size;
    let concluido = false;
    for (let posicao = 0; posicao < total; posicao += TAMANHO_PARTE_VIDEO) {
      const fimExclusivo = Math.min(posicao + TAMANHO_PARTE_VIDEO, total);
      const parte = video.arquivo.slice(posicao, fimExclusivo);
      const parametros = new URLSearchParams({
        acao: "parte",
        protocolo,
        inicio: String(posicao),
        fim: String(fimExclusivo - 1),
        total: String(total),
      });
      const resposta = await fetch(`/api/enviar/video?${parametros}`, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: parte,
      });
      const dados = await lerResposta(resposta);
      if (!resposta.ok) throw new Error(dados?.erro ?? "O envio do vídeo foi interrompido.");
      concluido = dados?.concluido === true;
      setProgressoEnvio(Math.round((fimExclusivo / total) * 100));
    }

    if (!concluido) throw new Error("Não foi possível concluir o envio do vídeo.");
    return protocolo;
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro("");

    if (!midia) {
      setErro("Selecione a foto ou o vídeo que você quer analisar.");
      return;
    }

    const dadosComuns = {
      ...campos,
      instagram: normalizarInstagram(campos.instagram),
      autorizaAnalise,
      autorizaPublicacao,
    };
    const corpo =
      midia.tipo === "imagem"
        ? {
            ...dadosComuns,
            imagemBase64: midia.base64,
            largura: midia.largura,
            altura: midia.altura,
          }
        : {
            ...dadosComuns,
            nomeArquivo,
            tamanho: midia.arquivo.size,
          };

    const validacao = midia.tipo === "imagem" ? validarPedido(corpo) : validarPedidoVideo(corpo);
    if (!validacao.ok) {
      setErro(validacao.erro);
      return;
    }

    setEtapa({ tipo: "enviando" });
    setProgressoEnvio(midia.tipo === "video" ? 1 : 0);
    try {
      const protocolo =
        midia.tipo === "imagem" ? await enviarImagem(corpo) : await enviarVideo(corpo, midia);
      setEtapa({ tipo: "enviado", protocolo });
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível enviar agora.");
      setEtapa({ tipo: "preenchendo" });
      setProgressoEnvio(0);
    }
  }

  function recomecar() {
    setCampos((atuais) => ({ ...camposVazios, nome: atuais.nome, email: atuais.email, instagram: atuais.instagram }));
    setAutorizaAnalise(false);
    setAutorizaPublicacao(false);
    setMidia(null);
    setNomeArquivo("");
    setTamanhoArquivo(0);
    setProgressoEnvio(0);
    setErro("");
    setEtapa({ tipo: "preenchendo" });
  }

  if (etapa.tipo === "enviado") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-emerald-200 bg-white px-6 py-12 text-center shadow-sm">
        <CircleCheck size={56} className="text-emerald-500" />
        <h3 className="text-2xl font-bold text-slate-900">Recebemos seu arquivo!</h3>
        <p className="text-slate-600">Seu protocolo é</p>
        <p className="rounded-lg bg-slate-100 px-5 py-2 font-mono text-2xl font-bold tracking-wider text-slate-900">
          {etapa.protocolo}
        </p>
        <p className="max-w-md text-sm text-slate-600">
          Enviamos uma confirmação para <strong>{campos.email}</strong>. O resultado da análise chega nesse
          e-mail em {site.prazoResposta}. Se não encontrar, confira a caixa de spam.
        </p>
        <button
          type="button"
          onClick={recomecar}
          className="mt-2 rounded-lg border border-slate-200 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Enviar outro arquivo
        </button>
      </div>
    );
  }

  const enviando = etapa.tipo === "enviando";

  return (
    <form
      onSubmit={enviar}
      noValidate
      className="flex flex-col gap-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"
    >
      <Secao titulo="Sua foto ou vídeo" descricao="Uma mídia por envio. Fotos até 30 MB e vídeos até 100 MB.">
        <div
          onDragOver={(evento) => {
            evento.preventDefault();
            setArrastando(true);
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={soltarArquivo}
          className={`rounded-xl border-2 border-dashed p-5 transition-colors ${
            arrastando ? "border-[#137FEC] bg-[#DCEBFB]" : "border-[#A8CDF4] bg-[#E6EFF8]"
          }`}
        >
          {midia ? (
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              {midia.tipo === "imagem" ? (
                <img
                  src={midia.previewUrl}
                  alt="Pré-visualização da foto selecionada"
                  className="h-44 w-full rounded-lg bg-slate-900 object-cover sm:w-64"
                />
              ) : midia.previewDisponivel ? (
                <video
                  src={midia.previewUrl}
                  aria-label="Pré-visualização do vídeo selecionado"
                  controls
                  muted
                  playsInline
                  className="h-44 w-full rounded-lg bg-slate-950 object-contain sm:w-64"
                />
              ) : (
                <div className="flex h-44 w-full items-center justify-center rounded-lg bg-slate-900 text-white sm:w-64">
                  <FileVideo size={46} />
                </div>
              )}
              <div className="flex min-w-0 flex-1 flex-col items-center gap-2 sm:items-start">
                <p className="max-w-full truncate font-medium text-slate-800">{nomeArquivo}</p>
                <p className="text-sm text-slate-500">
                  {midia.tipo === "imagem" ? `${midia.largura} × ${midia.altura} px · ` : ""}
                  {tamanhoLegivel(tamanhoArquivo)}
                </p>
                <button
                  type="button"
                  onClick={() => inputArquivo.current?.click()}
                  disabled={enviando}
                  className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <RefreshCw size={16} />
                  Trocar arquivo
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#137FEC]">
                {preparandoMidia ? <LoaderCircle size={26} className="animate-spin" /> : <FileUp size={26} />}
              </div>
              <p className="text-lg font-semibold text-slate-700">
                {preparandoMidia ? "Preparando o arquivo..." : "Arraste a foto ou o vídeo para cá"}
              </p>
              <p className="text-sm text-slate-500">JPG, PNG, WebP, MP4, MOV, WebM, AVI ou MKV</p>
              <button
                type="button"
                onClick={() => inputArquivo.current?.click()}
                disabled={preparandoMidia}
                className="rounded-lg bg-[#137FEC] px-8 py-2 font-medium text-white hover:bg-[#0F6FD1] disabled:opacity-50"
              >
                Escolher arquivo
              </button>
            </div>
          )}

          <input
            ref={inputArquivo}
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm,video/x-msvideo,video/x-matroska,.avi,.mkv"
            className="hidden"
            onChange={(evento) => void selecionarArquivo(evento.target.files?.[0])}
          />
        </div>
      </Secao>

      <Secao titulo="Seus dados" descricao="Usamos seu e-mail apenas para enviar o resultado.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Campo rotulo="E-mail" obrigatorio>
              <input
                type="email"
                autoComplete="email"
                required
                value={campos.email}
                onChange={(evento) => atualizar("email", evento.target.value)}
                placeholder="voce@exemplo.com"
                className={classeInput}
              />
            </Campo>
          </div>
          <Campo rotulo="Nome">
            <input
              type="text"
              autoComplete="name"
              value={campos.nome}
              onChange={(evento) => atualizar("nome", evento.target.value)}
              placeholder="Como podemos te chamar?"
              className={classeInput}
            />
          </Campo>
          <Campo rotulo="Instagram" dica="Para darmos o crédito, se o trabalho for publicado.">
            <input
              type="text"
              autoComplete="off"
              value={campos.instagram}
              onChange={(evento) => atualizar("instagram", evento.target.value)}
              placeholder="@seuperfil"
              className={classeInput}
            />
          </Campo>
        </div>
      </Secao>

      <Secao titulo="Sobre o evento" descricao="Opcional, mas ajuda na análise.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Campo rotulo="Nome do evento">
              <input
                type="text"
                value={campos.evento}
                onChange={(evento) => atualizar("evento", evento.target.value)}
                placeholder="Ex.: Show de réveillon na praia"
                className={classeInput}
              />
            </Campo>
          </div>
          <Campo rotulo="Data do evento">
            <input
              type="date"
              value={campos.dataEvento}
              onChange={(evento) => atualizar("dataEvento", evento.target.value)}
              className={classeInput}
            />
          </Campo>
          <Campo rotulo="Local">
            <input
              type="text"
              value={campos.local}
              onChange={(evento) => atualizar("local", evento.target.value)}
              placeholder="Ex.: Copacabana, Rio de Janeiro - RJ"
              className={classeInput}
            />
          </Campo>
        </div>
      </Secao>

      <Secao titulo="Autorizações">
        <div className="flex flex-col gap-3 text-sm text-slate-700">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={autorizaAnalise}
              onChange={(evento) => setAutorizaAnalise(evento.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#137FEC]"
            />
            <span>
              Sou autor da foto ou do vídeo, ou tenho direito de usá-lo, e autorizo o {site.nome} a analisá-lo.
              <span className="text-[#137FEC]"> *</span>
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={autorizaPublicacao}
              onChange={(evento) => setAutorizaPublicacao(evento.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#137FEC]"
            />
            <span>
              Autorizo a publicação do arquivo e do resultado no Instagram <strong>@{site.instagram}</strong>.
              (Opcional)
            </span>
          </label>
        </div>
      </Secao>

      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Não preencha este campo
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={campos.site}
            onChange={(evento) => atualizar("site", evento.target.value)}
          />
        </label>
      </div>

      {enviando && midia?.tipo === "video" ? (
        <div className="rounded-lg bg-[#E6EFF8] px-4 py-3" aria-live="polite">
          <div className="flex items-center justify-between text-sm font-medium text-[#0F6FD1]">
            <span>Enviando vídeo</span>
            <span>{progressoEnvio}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-[#137FEC] transition-[width]" style={{ width: `${progressoEnvio}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate-600">Mantenha esta página aberta até o envio terminar.</p>
        </div>
      ) : null}

      {erro ? (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <CircleAlert size={18} className="mt-0.5 shrink-0" />
          <p>{erro}</p>
        </div>
      ) : null}

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p className="text-xs text-slate-500">
          Ao enviar, você concorda com a nossa{" "}
          <a href="/privacidade" className="text-[#137FEC] hover:underline">
            política de privacidade
          </a>
          .
        </p>
        <button
          type="submit"
          disabled={enviando || preparandoMidia}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#137FEC] px-8 py-3 font-semibold text-white hover:bg-[#0F6FD1] disabled:opacity-60 sm:w-auto"
        >
          {enviando ? <LoaderCircle size={18} className="animate-spin" /> : <Send size={18} />}
          {enviando ? "Enviando..." : "Enviar para análise"}
        </button>
      </div>
    </form>
  );
}
