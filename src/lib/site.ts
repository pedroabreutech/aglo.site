export const site = {
  nome: "Aglo",
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM || "aglo.ia",
  emailContato: process.env.NEXT_PUBLIC_EMAIL_CONTATO || "",
  // Mantenha igual a PRAZO_RESPOSTA no Apps Script, que vai no e-mail de confirmação.
  prazoResposta: "até 3 dias",
  diasRetencaoFoto: 30,
};

export const urlInstagram = `https://www.instagram.com/${site.instagram}/`;
