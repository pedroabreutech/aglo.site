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
  "Foto",
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
    SEGREDO: Utilities.getUuid() + Utilities.getUuid().replace(/-/g, ""),
    ULTIMO_PROTOCOLO: "0",
    EMAIL_AVISO: Session.getEffectiveUser().getEmail(),
  });

  mostrarConfiguracao();
}

function mostrarConfiguracao() {
  const props = PropertiesService.getScriptProperties();
  Logger.log("APPS_SCRIPT_SECRET (copie para a Vercel): " + props.getProperty("SEGREDO"));
  Logger.log("Planilha: " + SpreadsheetApp.openById(props.getProperty("PLANILHA_ID")).getUrl());
  Logger.log("Pasta das fotos: " + DriveApp.getFolderById(props.getProperty("PASTA_RECEBIDAS_ID")).getUrl());
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

      const numero = Number(props.getProperty("ULTIMO_PROTOCOLO") || "0") + 1;
      props.setProperty("ULTIMO_PROTOCOLO", String(numero));
      protocolo = "AGL-" + String(numero).padStart(4, "0");

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
  };
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

function enviarEmails(pedido, protocolo, foto, props) {
  // Falha de e-mail não pode desfazer um pedido que já está salvo.
  try {
    if (MailApp.getRemainingDailyQuota() < 2) {
      console.warn("Cota diária de e-mails esgotada; " + protocolo + " ficou sem confirmação.");
      return;
    }

    const evento = pedido.evento ? " do evento <strong>" + html(pedido.evento) + "</strong>" : "";
    MailApp.sendEmail({
      to: pedido.email,
      name: NOME_REMETENTE,
      subject: "Recebemos sua foto (" + protocolo + ")",
      htmlBody:
        "<p>Olá" + (pedido.nome ? ", " + html(pedido.nome) : "") + "!</p>" +
        "<p>Recebemos sua foto" + evento + ". Seu protocolo é <strong>" + protocolo + "</strong>.</p>" +
        "<p>Vamos analisar a imagem e enviar o resultado para este e-mail em " + PRAZO_RESPOSTA + ".</p>" +
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
        "<p><a href=\"" + foto.getUrl() + "\">Abrir a foto no Drive</a> · " +
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
