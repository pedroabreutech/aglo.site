import Link from "next/link";
import { AtSign } from "lucide-react";
import { Logo } from "./Logo";
import { site, urlInstagram } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-center gap-3">
          <Logo />
          <span className="text-lg font-bold text-slate-900">{site.nome}</span>
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          <a
            href={urlInstagram}
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1 rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100 sm:flex"
          >
            <AtSign size={16} />
            {site.instagram}
          </a>
          <Link
            href="/#enviar"
            className="rounded-lg bg-[#137FEC] px-4 py-2 font-medium text-white hover:bg-[#0F6FD1]"
          >
            Enviar foto
          </Link>
        </nav>
      </div>
    </header>
  );
}
