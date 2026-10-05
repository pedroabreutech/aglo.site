// A Vercel recusa corpos acima de 4,5 MB; a foto já chega reduzida a 2048 px.
export const TAMANHO_MAXIMO_BASE64 = 4_000_000;

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

type ResultadoValidacao = { ok: true; pedido: Pedido } | { ok: false; erro: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const INSTAGRAM = /^[A-Za-z0-9._]{1,30}$/;
const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

function texto(valor: unknown, limite: number): string {
  return typeof valor === "string" ? valor.trim().slice(0, limite) : "";
}

function dimensao(valor: unknown): number {
  return typeof valor === "number" && Number.isInteger(valor) && valor > 0 ? valor : 0;
}

function falha(erro: string): ResultadoValidacao {
  return { ok: false, erro };
}

export function normalizarInstagram(valor: string): string {
  return valor.trim().replace(/^@+/, "");
}

export function validarPedido(dados: unknown): ResultadoValidacao {
  if (!dados || typeof dados !== "object") {
    return falha("Dados inválidos.");
  }

  const entrada = dados as Record<string, unknown>;

  const email = texto(entrada.email, 254).toLowerCase();
  if (!EMAIL.test(email)) {
    return falha("Informe um e-mail válido para receber o resultado.");
  }

  if (entrada.autorizaAnalise !== true) {
    return falha("É preciso autorizar a análise da imagem.");
  }

  const instagram = normalizarInstagram(texto(entrada.instagram, 31));
  if (instagram && !INSTAGRAM.test(instagram)) {
    return falha("Usuário do Instagram inválido.");
  }

  const dataEvento = texto(entrada.dataEvento, 10);
  if (dataEvento && !DATA_ISO.test(dataEvento)) {
    return falha("Data do evento inválida.");
  }

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
      nome: texto(entrada.nome, 100),
      email,
      instagram,
      evento: texto(entrada.evento, 120),
      dataEvento,
      local: texto(entrada.local, 160),
      autorizaPublicacao: entrada.autorizaPublicacao === true,
      imagemBase64,
      largura,
      altura,
    },
  };
}
