import Link from "next/link";
import { Logo } from "./Logo";
import { site, urlInstagram } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Logo tamanho={28} />
          <p>
            As contagens do {site.nome} são estimativas feitas por inteligência artificial.
          </p>
        </div>

        <nav className="flex gap-5">
          <Link href="/privacidade" className="hover:text-slate-800">
            Privacidade
          </Link>
          <a href={urlInstagram} target="_blank" rel="noreferrer" className="hover:text-slate-800">
            Instagram
          </a>
        </nav>
      </div>
    </footer>
  );
}
