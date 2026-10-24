// A Vercel recusa corpos acima de 4,5 MB; a foto já chega reduzida a 2048 px.
export const TAMANHO_MAXIMO_BASE64 = 4_000_000;
export const TAMANHO_MAXIMO_VIDEO = 100 * 1024 * 1024;

export const FORMATOS_VIDEO = ["mp4", "mov", "webm", "avi", "mkv"] as const;

export type FormatoVideo = (typeof FORMATOS_VIDEO)[number];

export type Pedido = {
  nome: string;
  email: string;
  instagram: string;
  evento: string;
  dataEvento: string;
  local: string;
  autorizaPublicacao: boolean;
  imagemBase64: string;
  largura: number;
  altura: number;
};

export type PedidoVideo = {
  nome: string;
  email: string;
  instagram: string;
  evento: string;
  dataEvento: string;
  local: string;
  autorizaPublicacao: boolean;
  nomeArquivo: string;
  formato: FormatoVideo;
  mimeType: string;
  tamanho: number;
};

type ResultadoValidacao = { ok: true; pedido: Pedido } | { ok: false; erro: string };
type ResultadoValidacaoVideo = { ok: true; pedido: PedidoVideo } | { ok: false; erro: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const INSTAGRAM = /^[A-Za-z0-9._]{1,30}$/;
const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
const MIME_VIDEO: Record<FormatoVideo, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
};

function texto(valor: unknown, limite: number): string {
  return typeof valor === "string" ? valor.trim().slice(0, limite) : "";
}

function dimensao(valor: unknown): number {
  return typeof valor === "number" && Number.isInteger(valor) && valor > 0 ? valor : 0;
}

function falha(erro: string): { ok: false; erro: string } {
  return { ok: false, erro };
}

export function normalizarInstagram(valor: string): string {
  return valor.trim().replace(/^@+/, "");
}

function validarCamposComuns(entrada: Record<string, unknown>) {
  const email = texto(entrada.email, 254).toLowerCase();
  if (!EMAIL.test(email)) {
    return falha("Informe um e-mail válido para receber o resultado.");
  }

  if (entrada.autorizaAnalise !== true) {
    return falha("É preciso autorizar a análise do arquivo.");
  }

  const instagram = normalizarInstagram(texto(entrada.instagram, 31));
  if (instagram && !INSTAGRAM.test(instagram)) {
    return falha("Usuário do Instagram inválido.");
  }

  const dataEvento = texto(entrada.dataEvento, 10);
  if (dataEvento && !DATA_ISO.test(dataEvento)) {
    return falha("Data do evento inválida.");
  }

  return {
    ok: true as const,
    dados: {
      nome: texto(entrada.nome, 100),
      email,
      instagram,
      evento: texto(entrada.evento, 120),
      dataEvento,
      local: texto(entrada.local, 160),
      autorizaPublicacao: entrada.autorizaPublicacao === true,
    },
  };
}

export function validarPedido(dados: unknown): ResultadoValidacao {
  if (!dados || typeof dados !== "object") {
    return falha("Dados inválidos.");
  }

  const entrada = dados as Record<string, unknown>;

  const comuns = validarCamposComuns(entrada);
  if (!comuns.ok) return comuns;

  const imagemBase64 = typeof entrada.imagemBase64 === "string" ? entrada.imagemBase64 : "";
  if (!imagemBase64) {
    return falha("Selecione a foto que você quer analisar.");
  }
  if (imagemBase64.length > TAMANHO_MAXIMO_BASE64) {
    return falha("A foto ficou grande demais para envio. Tente outra imagem.");
  }
  if (!BASE64.test(imagemBase64)) {
    return falha("Não foi possível ler a imagem. Selecione a foto novamente.");
  }

  const largura = dimensao(entrada.largura);
  const altura = dimensao(entrada.altura);
  if (!largura || !altura) {
    return falha("Não foi possível ler a imagem. Selecione a foto novamente.");
  }

  return {
    ok: true,
    pedido: {
      ...comuns.dados,
      imagemBase64,
      largura,
      altura,
    },
  };
}

export function validarPedidoVideo(dados: unknown): ResultadoValidacaoVideo {
  if (!dados || typeof dados !== "object") {
    return falha("Dados inválidos.");
  }

  const entrada = dados as Record<string, unknown>;
  const comuns = validarCamposComuns(entrada);
  if (!comuns.ok) return comuns;

  const nomeArquivo = texto(entrada.nomeArquivo, 180);
  const formato = nomeArquivo.split(".").pop()?.toLowerCase() as FormatoVideo | undefined;
  if (!formato || !FORMATOS_VIDEO.includes(formato)) {
    return falha("Selecione um vídeo MP4, MOV, WebM, AVI ou MKV.");
  }

  const tamanho =
    typeof entrada.tamanho === "number" && Number.isInteger(entrada.tamanho) ? entrada.tamanho : 0;
  if (!tamanho || tamanho > TAMANHO_MAXIMO_VIDEO) {
    return falha("O vídeo deve ter no máximo 100 MB.");
  }

  return {
    ok: true,
    pedido: {
      ...comuns.dados,
      nomeArquivo,
      formato,
      mimeType: MIME_VIDEO[formato],
      tamanho,
    },
  };
}
