import { NextResponse } from "next/server";
import { validarPedido } from "@/lib/pedido";

export const maxDuration = 30;

const ERRO_GENERICO = "Não foi possível enviar agora. Tente novamente em alguns minutos.";

type RespostaAppsScript = {
  ok?: boolean;
  protocolo?: string;
  codigo?: string;
  erro?: string;
};

function erro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
}

export async function POST(request: Request) {
  const appsScriptUrl = process.env.APPS_SCRIPT_URL;
  const segredo = process.env.APPS_SCRIPT_SECRET;
  if (!appsScriptUrl || !segredo) {
    console.error("envio_nao_configurado: defina APPS_SCRIPT_URL e APPS_SCRIPT_SECRET");
    return erro("O envio está temporariamente indisponível.", 503);
  }

  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return erro("Dados inválidos.", 400);
  }

  // Campo invisível para pessoas: se veio preenchido, é robô. Responde como sucesso
  // para não dar pista do bloqueio.
  if ((corpo as Record<string, unknown> | null)?.site) {
    return NextResponse.json({ protocolo: "AGL-0000" });
  }

  const validacao = validarPedido(corpo);
  if (!validacao.ok) {
    return erro(validacao.erro, 400);
  }

  try {
    // Content-Type text/plain: o Apps Script lê o corpo cru em e.postData.contents.
    const resposta = await fetch(appsScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ segredo, ...validacao.pedido }),
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
    const dados = (await resposta.json().catch(() => null)) as RespostaAppsScript | null;

    if (resposta.ok && dados?.ok && dados.protocolo) {
      return NextResponse.json({ protocolo: dados.protocolo });
    }

    console.error("apps_script_recusou", resposta.status, dados?.codigo, dados?.erro);
    if (dados?.codigo === "limite") {
      return erro(dados.erro ?? "Limite diário de envios atingido.", 429);
    }
    if (dados?.codigo === "invalido") {
      return erro(dados.erro ?? "Dados inválidos.", 400);
    }
    return erro(ERRO_GENERICO, 502);
  } catch (falha) {
    console.error("apps_script_indisponivel", falha);
    return erro(ERRO_GENERICO, 502);
  }
}
