import { NextResponse } from "next/server";
import { validarPedidoVideo } from "@/lib/pedido";

export const maxDuration = 30;

const TAMANHO_PARTE = 2 * 1024 * 1024;
const ERRO_GENERICO = "Não foi possível enviar o vídeo agora. Tente novamente em alguns minutos.";

type RespostaAppsScript = {
  ok?: boolean;
  protocolo?: string;
  concluido?: boolean;
  codigo?: string;
  erro?: string;
};

function erro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
}

async function chamarAppsScript(corpo: Record<string, unknown>) {
  const appsScriptUrl = process.env.APPS_SCRIPT_URL;
  const segredo = process.env.APPS_SCRIPT_SECRET;
  if (!appsScriptUrl || !segredo) {
    console.error("envio_nao_configurado: defina APPS_SCRIPT_URL e APPS_SCRIPT_SECRET");
    return { resposta: null, erro: erro("O envio está temporariamente indisponível.", 503) };
  }

  try {
    const resposta = await fetch(appsScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ segredo, ...corpo }),
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
    const dados = (await resposta.json().catch(() => null)) as RespostaAppsScript | null;
    if (!resposta.ok || !dados?.ok) {
      console.error("apps_script_recusou_video", resposta.status, dados?.codigo, dados?.erro);
      const status = dados?.codigo === "limite" ? 429 : dados?.codigo === "invalido" ? 400 : 502;
      return { resposta: null, erro: erro(dados?.erro ?? ERRO_GENERICO, status) };
    }
    return { resposta: dados, erro: null };
  } catch (falha) {
    console.error("apps_script_indisponivel_video", falha);
    return { resposta: null, erro: erro(ERRO_GENERICO, 502) };
  }
}

function parametroInteiro(url: URL, nome: string) {
  const valor = Number(url.searchParams.get(nome));
  return Number.isInteger(valor) && valor >= 0 ? valor : -1;
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const acao = url.searchParams.get("acao");

  if (acao === "iniciar") {
    let corpo: unknown;
    try {
      corpo = await request.json();
    } catch {
      return erro("Dados inválidos.", 400);
    }

    if ((corpo as Record<string, unknown> | null)?.site) {
      return NextResponse.json({ protocolo: "AGL-0000" });
    }

    const validacao = validarPedidoVideo(corpo);
    if (!validacao.ok) return erro(validacao.erro, 400);

    const resultado = await chamarAppsScript({ acao: "iniciar_video", ...validacao.pedido });
    if (resultado.erro) return resultado.erro;
    return NextResponse.json({ protocolo: resultado.resposta?.protocolo });
  }

  if (acao === "parte") {
    const protocolo = url.searchParams.get("protocolo") ?? "";
    const inicio = parametroInteiro(url, "inicio");
    const fim = parametroInteiro(url, "fim");
    const total = parametroInteiro(url, "total");
    if (!/^AGL-\d{4,}$/.test(protocolo) || inicio < 0 || fim < inicio || total <= fim) {
      return erro("Parte de vídeo inválida.", 400);
    }

    const bytes = await request.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > TAMANHO_PARTE) {
      return erro("Parte de vídeo inválida.", 400);
    }

    const resultado = await chamarAppsScript({
      acao: "parte_video",
      protocolo,
      inicio,
      fim,
      total,
      parteBase64: Buffer.from(bytes).toString("base64"),
    });
    if (resultado.erro) return resultado.erro;
    return NextResponse.json({
      protocolo,
      concluido: resultado.resposta?.concluido === true,
    });
  }

  return erro("Ação inválida.", 400);
}
