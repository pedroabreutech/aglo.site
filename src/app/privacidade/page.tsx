import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { site, urlInstagram } from "@/lib/site";

export const metadata: Metadata = {
  title: "Política de privacidade | Aglo",
};

export default function Privacidade() {
  const contato = site.emailContato ? (
    <a href={`mailto:${site.emailContato}`} className="text-[#137FEC] hover:underline">
      {site.emailContato}
    </a>
  ) : (
    <a href={urlInstagram} target="_blank" rel="noreferrer" className="text-[#137FEC] hover:underline">
      @{site.instagram} no Instagram
    </a>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-14">
        <h1 className="text-3xl font-bold text-slate-900">Política de privacidade</h1>
        <p className="mt-2 text-sm text-slate-500">
          Como o {site.nome} trata os dados enviados por este site.
        </p>

        <div className="mt-10 flex flex-col gap-8 text-slate-700 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-slate-900 [&_li]:mt-1 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
          <section>
            <h2>O que coletamos</h2>
            <ul>
              <li>Seu e-mail, para enviar o resultado da análise.</li>
              <li>Nome e usuário do Instagram, se você informar.</li>
              <li>Nome, data e local do evento, se você informar.</li>
              <li>
                A foto enviada. Antes do envio, o próprio navegador reduz a imagem e remove os
                metadados do arquivo, como a localização GPS.
              </li>
            </ul>
          </section>

          <section>
            <h2>Como usamos</h2>
            <ul>
              <li>
                A foto é analisada pela equipe {site.nome} com um modelo de inteligência artificial
                de contagem de multidões, e o resultado é enviado para o seu e-mail.
              </li>
              <li>Não vendemos nem compartilhamos seus dados com terceiros.</li>
              <li>Não enviamos propaganda para o seu e-mail.</li>
            </ul>
          </section>

          <section>
            <h2>Publicação no Instagram</h2>
            <p className="mt-2">
              A foto e o resultado só são publicados em @{site.instagram} se você marcar a
              autorização no formulário. Antes de publicar, rostos nítidos são desfocados e fotos
              com crianças em destaque não são publicadas. Você pode pedir a remoção de uma
              publicação a qualquer momento.
            </p>
          </section>

          <section>
            <h2>Por quanto tempo guardamos</h2>
            <p className="mt-2">
              A foto é apagada em até {site.diasRetencaoFoto} dias após o envio do resultado. O
              registro do pedido (protocolo, e-mail e contagem) é mantido para controle interno.
            </p>
          </section>

          <section>
            <h2>Seus direitos</h2>
            <p className="mt-2">
              Conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você pode pedir acesso,
              correção ou exclusão dos seus dados a qualquer momento. Basta entrar em contato pelo{" "}
              {contato}, informando o protocolo do envio.
            </p>
          </section>

          <section>
            <h2>Sobre as contagens</h2>
            <p className="mt-2">
              Os números são estimativas feitas por inteligência artificial e podem variar conforme
              o ângulo, a resolução e as pessoas encobertas na foto. Eles não devem ser usados como
              contagem oficial.
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
