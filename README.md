# Aglo — Página de envio

Site público onde qualquer pessoa envia uma foto de multidão para ser analisada.
Os pedidos chegam numa planilha do Google e as fotos numa pasta do Google Drive;
a análise é feita no Aglo local e o resultado é respondido por e-mail.

```
Navegador ──► Vercel (Next.js, /api/enviar) ──► Google Apps Script ──► Drive + Planilha + Gmail
```

- O navegador reduz a foto para no máximo 2048 px e remove os metadados (EXIF/GPS).
- A rota `/api/enviar` valida os dados e repassa ao Apps Script com um segredo, então
  ninguém consegue gravar na planilha sem passar pelo site.
- O Apps Script salva a foto em `Aglo/Recebidas/AGL-0001.jpg`, registra a linha na
  planilha "Aglo – Pedidos" e envia a confirmação ao usuário e um aviso a você.

## 1. Google Apps Script

1. Crie (ou use) uma conta Google só para o projeto, por exemplo `aglo.contagem@gmail.com`.
2. Em <https://script.google.com>, crie um projeto chamado "Aglo – Recebimento".
3. Em **Configurações do projeto**, marque "Mostrar arquivo de manifesto appsscript.json".
4. Cole o conteúdo de `apps-script/Code.gs` e `apps-script/appsscript.json` nos arquivos
   de mesmo nome do editor.
5. Selecione a função `configurar` e clique em **Executar**. Autorize o acesso ao Drive,
   Planilhas e Gmail. O log mostra o segredo, o link da planilha e o da pasta.
6. **Implantar → Nova implantação → Aplicativo da Web**, com "Executar como: Eu" e
   "Quem pode acessar: Qualquer pessoa". Copie a URL que termina em `/exec`.

Para ver o segredo de novo, execute `mostrarConfiguracao`. Depois de alterar o
`Code.gs`, publique em **Implantar → Gerenciar implantações → Editar → Nova versão**
para manter a mesma URL.

## 2. Vercel

1. Em <https://vercel.com>, importe o repositório. O projeto já publicado se chama `aglo.ia`
   e responde em <https://aglo-ia.vercel.app>.
2. Em **Environment Variables**, preencha (ver `.env.example`):
   - `APPS_SCRIPT_URL`: a URL `/exec` do passo anterior
   - `APPS_SCRIPT_SECRET`: o segredo mostrado pelo `configurar`
   - `NEXT_PUBLIC_INSTAGRAM`: usuário do Instagram, sem `@`
   - `NEXT_PUBLIC_EMAIL_CONTATO`: e-mail exibido na política de privacidade (opcional)
3. Faça o deploy. O site fica em `https://<projeto>.vercel.app`.

O usuário do Instagram e o prazo de resposta também aparecem no e-mail de confirmação:
ajuste `INSTAGRAM` e `PRAZO_RESPOSTA` no topo do `Code.gs` para ficarem iguais ao site
(`src/lib/site.ts`).

## 3. No seu Mac

Instale o [Google Drive para computador](https://www.google.com/drive/download/) com a
conta do projeto: a pasta `Aglo/Recebidas` aparece no Finder e as fotos chegam sozinhas.
Analise no Aglo local, responda pelo Gmail e atualize o status na planilha.

## Rodando localmente

```bash
corepack pnpm install
cp .env.example .env   # preencha APPS_SCRIPT_URL e APPS_SCRIPT_SECRET
corepack pnpm dev --port 3200
```
