/**
 * Recebe os pedidos de análise enviados pela página de envio do Aglo.
 * Instalação: README.md do projeto do site.
 */

const PRAZO_RESPOSTA = "até 3 dias";
const LIMITE_DIARIO_POR_EMAIL = 5;
const NOME_REMETENTE = "Aglo";
const INSTAGRAM = "aglo.ia";

const CABECALHO = [
  "Protocolo",
  "Recebido em",
  "Nome",
  "E-mail",
  "Instagram",
  "Evento",
  "Data do evento",
  "Local",
  "Autoriza publicação",
  "Arquivo",
  "Status",
  "Contagem",
  "Respondido em",
  "Observações",
];
const COLUNA_STATUS = CABECALHO.indexOf("Status") + 1;
const STATUS = ["Pendente", "Em análise", "Enviado", "Recusado"];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DATA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

class ErroPedido extends Error {}

/** Rode uma vez pelo editor: cria pastas, planilha e o segredo usado pela Vercel. */
function configurar() {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty("PLANILHA_ID")) {
    Logger.log("Já configurado. Para ver o segredo de novo, rode mostrarConfiguracao().");
    mostrarConfiguracao();
    return;
  }

  const raiz = DriveApp.createFolder("Aglo");
  const recebidas = raiz.createFolder("Recebidas");
  raiz.createFolder("Respondidas");

  const planilha = SpreadsheetApp.create("Aglo – Pedidos");
  DriveApp.getFileById(planilha.getId()).moveTo(raiz);

  const aba = planilha.getSheets()[0];
  aba.setName("Pedidos");
  aba
    .getRange(1, 1, 1, CABECALHO.length)
    .setValues([CABECALHO])
    .setFontWeight("bold")
    .setBackground("#137FEC")
    .setFontColor("#FFFFFF");
  aba.setFrozenRows(1);
  aba
    .getRange(2, COLUNA_STATUS, aba.getMaxRows() - 1, 1)
    .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(STATUS, true).build());

  props.setProperties({
    PLANILHA_ID: planilha.getId(),
    PASTA_RECEBIDAS_ID: recebidas.getId(),
    // Segredo.gs fica só no projeto do Apps Script (está no .gitignore); sem ele, gera um novo.
    SEGREDO:
      typeof SEGREDO_VERCEL !== "undefined"
        ? SEGREDO_VERCEL
        : Utilities.getUuid() + Utilities.getUuid().replace(/-/g, ""),
    ULTIMO_PROTOCOLO: "0",
    EMAIL_AVISO: Session.getEffectiveUser().getEmail(),
  });

  mostrarConfiguracao();
}

function mostrarConfiguracao() {
  const props = PropertiesService.getScriptProperties();
  Logger.log("APPS_SCRIPT_SECRET (copie para a Vercel): " + props.getProperty("SEGREDO"));
  Logger.log("Planilha: " + SpreadsheetApp.openById(props.getProperty("PLANILHA_ID")).getUrl());
  Logger.log("Pasta dos arquivos: " + DriveApp.getFolderById(props.getProperty("PASTA_RECEBIDAS_ID")).getUrl());
  Logger.log("Avisos de novos pedidos vão para: " + props.getProperty("EMAIL_AVISO"));
}

function doPost(e) {
  try {
    const props = PropertiesService.getScriptProperties();
    const segredo = props.getProperty("SEGREDO");
    if (!segredo) {
      return responder({ ok: false, codigo: "nao_configurado", erro: "Rode configurar() antes de publicar." });
    }

    const dados = JSON.parse(e.postData.contents);
    if (dados.segredo !== segredo) {
      return responder({ ok: false, codigo: "nao_autorizado", erro: "Não autorizado." });
    }

    if (dados.acao === "iniciar_video") return iniciarVideo(dados, props);
    if (dados.acao === "parte_video") return receberParteVideo(dados, props);

    const pedido = validar(dados);

    const trava = LockService.getScriptLock();
    trava.waitLock(20000);
    let protocolo;
    let foto;
    try {
      const aba = SpreadsheetApp.openById(props.getProperty("PLANILHA_ID")).getSheetByName("Pedidos");
      if (enviosDeHoje(aba, pedido.email) >= LIMITE_DIARIO_POR_EMAIL) {
        return responder({
          ok: false,
          codigo: "limite",
          erro: "Você atingiu o limite de " + LIMITE_DIARIO_POR_EMAIL + " envios por dia. Tente novamente amanhã.",
        });
      }

      protocolo = proximoProtocolo(props);

      foto = DriveApp.getFolderById(props.getProperty("PASTA_RECEBIDAS_ID")).createFile(
        Utilities.newBlob(Utilities.base64Decode(pedido.imagemBase64), "image/jpeg", protocolo + ".jpg"),
      );

      aba.appendRow([
        protocolo,
        new Date(),
        celula(pedido.nome),
        celula(pedido.email),
        pedido.instagram ? "@" + pedido.instagram : "",
        celula(pedido.evento),
        pedido.dataEvento,
        celula(pedido.local),
        pedido.autorizaPublicacao ? "Sim" : "Não",
        foto.getUrl(),
        "Pendente",
      ]);
    } finally {
      trava.releaseLock();
    }

    enviarEmails(pedido, protocolo, foto, props);
    return responder({ ok: true, protocolo: protocolo });
  } catch (erro) {
    if (erro instanceof ErroPedido) {
      return responder({ ok: false, codigo: "invalido", erro: erro.message });
    }
    console.error(erro);
    return responder({ ok: false, codigo: "erro_interno", erro: "Não foi possível registrar o pedido." });
  }
}

function validar(dados) {
  const texto = (valor, limite) => (typeof valor === "string" ? valor.trim().slice(0, limite) : "");

  const email = texto(dados.email, 254).toLowerCase();
  if (!EMAIL.test(email)) throw new ErroPedido("E-mail inválido.");

  const imagemBase64 = typeof dados.imagemBase64 === "string" ? dados.imagemBase64 : "";
  if (!imagemBase64) throw new ErroPedido("Imagem ausente.");

  const instagram = texto(dados.instagram, 30).replace(/^@+/, "");
  if (instagram && !/^[A-Za-z0-9._]{1,30}$/.test(instagram)) throw new ErroPedido("Instagram inválido.");

  const partesData = DATA_ISO.exec(texto(dados.dataEvento, 10));

  return {
    nome: texto(dados.nome, 100),
    email: email,
    instagram: instagram,
    evento: texto(dados.evento, 120),
    dataEvento: partesData ? new Date(Number(partesData[1]), Number(partesData[2]) - 1, Number(partesData[3])) : "",
    local: texto(dados.local, 160),
    autorizaPublicacao: dados.autorizaPublicacao === true,
    imagemBase64: imagemBase64,
    tipoMidia: "foto",
  };
}

function proximoProtocolo(props) {
  const numero = Number(props.getProperty("ULTIMO_PROTOCOLO") || "0") + 1;
  props.setProperty("ULTIMO_PROTOCOLO", String(numero));
  return "AGL-" + String(numero).padStart(4, "0");
}

function iniciarVideo(dados, props) {
  const pedido = validarVideo(dados);
  limparUploadsAntigos(props);

  const trava = LockService.getScriptLock();
  trava.waitLock(20000);
  let protocolo;
  try {
    const aba = SpreadsheetApp.openById(props.getProperty("PLANILHA_ID")).getSheetByName("Pedidos");
    if (enviosDeHoje(aba, pedido.email) >= LIMITE_DIARIO_POR_EMAIL) {
      return responder({
        ok: false,
        codigo: "limite",
        erro: "Você atingiu o limite de " + LIMITE_DIARIO_POR_EMAIL + " envios por dia. Tente novamente amanhã.",
      });
    }
    protocolo = proximoProtocolo(props);
  } finally {
    trava.releaseLock();
  }

  const nome = protocolo + "." + pedido.formato;
  const resposta = UrlFetchApp.fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id%2CwebViewLink",
    {
      method: "post",
      contentType: "application/json; charset=UTF-8",
      headers: {
        Authorization: "Bearer " + ScriptApp.getOAuthToken(),
        "X-Upload-Content-Type": pedido.mimeType,
        "X-Upload-Content-Length": String(pedido.tamanho),
      },
      payload: JSON.stringify({
        name: nome,
        parents: [props.getProperty("PASTA_RECEBIDAS_ID")],
      }),
      muteHttpExceptions: true,
    },
  );

  const cabecalhos = resposta.getHeaders();
  const uploadUrl = cabecalhos.Location || cabecalhos.location;
  if (resposta.getResponseCode() !== 200 || !uploadUrl) {
    console.error("Falha ao iniciar upload no Drive", resposta.getResponseCode(), resposta.getContentText());
    throw new Error("Não foi possível iniciar o envio do vídeo.");
  }

  props.setProperty(
    "UPLOAD_" + protocolo,
    JSON.stringify({
      uploadUrl: uploadUrl,
      pedido: pedido,
      proximoByte: 0,
      criadoEm: Date.now(),
    }),
  );

  return responder({ ok: true, protocolo: protocolo });
}

function receberParteVideo(dados, props) {
  const protocolo = typeof dados.protocolo === "string" ? dados.protocolo : "";
  if (!/^AGL-\d{4,}$/.test(protocolo)) throw new ErroPedido("Protocolo inválido.");

  const chave = "UPLOAD_" + protocolo;
  const salvo = props.getProperty(chave);
  if (!salvo) throw new ErroPedido("O envio expirou. Selecione o vídeo novamente.");

  const estado = JSON.parse(salvo);
  const inicio = Number(dados.inicio);
  const fim = Number(dados.fim);
  const total = Number(dados.total);
  if (
    !Number.isInteger(inicio) ||
    !Number.isInteger(fim) ||
    !Number.isInteger(total) ||
    inicio !== estado.proximoByte ||
    fim < inicio ||
    total !== estado.pedido.tamanho ||
    fim >= total
  ) {
    throw new ErroPedido("Parte do vídeo fora de ordem.");
  }

  const parteBase64 = typeof dados.parteBase64 === "string" ? dados.parteBase64 : "";
  if (!parteBase64 || parteBase64.length > 3000000) throw new ErroPedido("Parte do vídeo inválida.");
  const bytes = Utilities.base64Decode(parteBase64);
  if (bytes.length !== fim - inicio + 1) throw new ErroPedido("Tamanho da parte do vídeo inválido.");

  const resposta = UrlFetchApp.fetch(estado.uploadUrl, {
    method: "put",
    contentType: estado.pedido.mimeType,
    headers: { "Content-Range": "bytes " + inicio + "-" + fim + "/" + total },
    payload: bytes,
    muteHttpExceptions: true,
  });
  const status = resposta.getResponseCode();

  if (status === 308) {
    estado.proximoByte = fim + 1;
    props.setProperty(chave, JSON.stringify(estado));
    return responder({ ok: true, protocolo: protocolo, concluido: false });
  }

  if (status !== 200 && status !== 201) {
    console.error("Falha ao enviar parte ao Drive", status, resposta.getContentText());
    throw new Error("Não foi possível salvar uma parte do vídeo.");
  }

  const resultado = JSON.parse(resposta.getContentText());
  const arquivo = DriveApp.getFileById(resultado.id);
  concluirVideo(estado.pedido, protocolo, arquivo, props);
  props.deleteProperty(chave);
  return responder({ ok: true, protocolo: protocolo, concluido: true });
}

function concluirVideo(pedido, protocolo, arquivo, props) {
  const trava = LockService.getScriptLock();
  trava.waitLock(20000);
  try {
    const partesData = DATA_ISO.exec(pedido.dataEvento || "");
    const dataEvento = partesData
      ? new Date(Number(partesData[1]), Number(partesData[2]) - 1, Number(partesData[3]))
      : "";
    const aba = SpreadsheetApp.openById(props.getProperty("PLANILHA_ID")).getSheetByName("Pedidos");
    aba.appendRow([
      protocolo,
      new Date(),
      celula(pedido.nome),
      celula(pedido.email),
      pedido.instagram ? "@" + pedido.instagram : "",
      celula(pedido.evento),
      dataEvento,
      celula(pedido.local),
      pedido.autorizaPublicacao ? "Sim" : "Não",
      arquivo.getUrl(),
      "Pendente",
    ]);
  } finally {
    trava.releaseLock();
  }

  enviarEmails(pedido, protocolo, arquivo, props);
}

function validarVideo(dados) {
  const texto = (valor, limite) => (typeof valor === "string" ? valor.trim().slice(0, limite) : "");
  const email = texto(dados.email, 254).toLowerCase();
  if (!EMAIL.test(email)) throw new ErroPedido("E-mail inválido.");

  const instagram = texto(dados.instagram, 30).replace(/^@+/, "");
  if (instagram && !/^[A-Za-z0-9._]{1,30}$/.test(instagram)) throw new ErroPedido("Instagram inválido.");

  const formatos = ["mp4", "mov", "webm", "avi", "mkv"];
  const formato = texto(dados.formato, 4).toLowerCase();
  if (formatos.indexOf(formato) === -1) throw new ErroPedido("Formato de vídeo inválido.");

  const tamanho = Number(dados.tamanho);
  if (!Number.isInteger(tamanho) || tamanho <= 0 || tamanho > 100 * 1024 * 1024) {
    throw new ErroPedido("O vídeo deve ter no máximo 100 MB.");
  }

  const mimePorFormato = {
    mp4: "video/mp4",
    mov: "video/quicktime",
    webm: "video/webm",
    avi: "video/x-msvideo",
    mkv: "video/x-matroska",
  };
  const mimeType = texto(dados.mimeType, 80);
  if (mimeType !== mimePorFormato[formato]) throw new ErroPedido("Tipo de vídeo inválido.");

  return {
    nome: texto(dados.nome, 100),
    email: email,
    instagram: instagram,
    evento: texto(dados.evento, 120),
    dataEvento: texto(dados.dataEvento, 10),
    local: texto(dados.local, 160),
    autorizaPublicacao: dados.autorizaPublicacao === true,
    nomeArquivo: texto(dados.nomeArquivo, 180),
    formato: formato,
    mimeType: mimeType,
    tamanho: tamanho,
    tipoMidia: "vídeo",
  };
}

function limparUploadsAntigos(props) {
  const agora = Date.now();
  const todas = props.getProperties();
  Object.keys(todas).forEach((chave) => {
    if (chave.indexOf("UPLOAD_") !== 0) return;
    try {
      const estado = JSON.parse(todas[chave]);
      if (!estado.criadoEm || agora - estado.criadoEm > 24 * 60 * 60 * 1000) props.deleteProperty(chave);
    } catch (_) {
      props.deleteProperty(chave);
    }
  });
}

/** Impede que um texto enviado pelo usuário vire fórmula na planilha. */
function celula(valor) {
  return /^[=+\-@]/.test(valor) ? "'" + valor : valor;
}

function enviosDeHoje(aba, email) {
  const ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 2) return 0;

  const primeira = Math.max(2, ultimaLinha - 499);
  const linhas = aba.getRange(primeira, 2, ultimaLinha - primeira + 1, 3).getValues();
  const fuso = Session.getScriptTimeZone();
  const hoje = Utilities.formatDate(new Date(), fuso, "yyyy-MM-dd");

  return linhas.filter(
    ([recebidoEm, , emailLinha]) =>
      recebidoEm instanceof Date &&
      Utilities.formatDate(recebidoEm, fuso, "yyyy-MM-dd") === hoje &&
      String(emailLinha).replace(/^'/, "").toLowerCase() === email,
  ).length;
}

function enviarEmails(pedido, protocolo, arquivo, props) {
  // Falha de e-mail não pode desfazer um pedido que já está salvo.
  try {
    if (MailApp.getRemainingDailyQuota() < 2) {
      console.warn("Cota diária de e-mails esgotada; " + protocolo + " ficou sem confirmação.");
      return;
    }

    const tipoMidia = pedido.tipoMidia || "foto";
    const evento = pedido.evento ? " do evento <strong>" + html(pedido.evento) + "</strong>" : "";
    MailApp.sendEmail({
      to: pedido.email,
      name: NOME_REMETENTE,
      subject: "Recebemos seu arquivo (" + protocolo + ")",
      htmlBody:
        "<p>Olá" + (pedido.nome ? ", " + html(pedido.nome) : "") + "!</p>" +
        "<p>Recebemos seu " + tipoMidia + evento + ". Seu protocolo é <strong>" + protocolo + "</strong>.</p>" +
        "<p>Vamos analisar o arquivo e enviar o resultado para este e-mail em " + PRAZO_RESPOSTA + ".</p>" +
        "<p>Se você não fez este envio, pode ignorar esta mensagem.</p>" +
        "<p>Equipe Aglo<br>Instagram: <a href=\"https://www.instagram.com/" + INSTAGRAM + "/\">@" + INSTAGRAM + "</a></p>",
    });

    const linhas = [
      ["Nome", pedido.nome],
      ["E-mail", pedido.email],
      ["Instagram", pedido.instagram ? "@" + pedido.instagram : ""],
      ["Evento", pedido.evento],
      ["Data do evento", pedido.dataEvento ? Utilities.formatDate(pedido.dataEvento, Session.getScriptTimeZone(), "dd/MM/yyyy") : ""],
      ["Local", pedido.local],
      ["Autoriza publicação", pedido.autorizaPublicacao ? "Sim" : "Não"],
    ]
      .filter(([, valor]) => valor)
      .map(([rotulo, valor]) => "<li><strong>" + rotulo + ":</strong> " + html(valor) + "</li>")
      .join("");

    MailApp.sendEmail({
      to: props.getProperty("EMAIL_AVISO"),
      name: NOME_REMETENTE,
      replyTo: pedido.email,
      subject: "Novo pedido Aglo: " + protocolo,
      htmlBody:
        "<ul>" + linhas + "</ul>" +
        "<p><a href=\"" + arquivo.getUrl() + "\">Abrir o arquivo no Drive</a> · " +
        "<a href=\"" + SpreadsheetApp.openById(props.getProperty("PLANILHA_ID")).getUrl() + "\">Abrir a planilha</a></p>",
    });
  } catch (erro) {
    console.error("Falha ao enviar e-mails do pedido " + protocolo, erro);
  }
}

function html(valor) {
  return String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function responder(corpo) {
  return ContentService.createTextOutput(JSON.stringify(corpo)).setMimeType(ContentService.MimeType.JSON);
}
