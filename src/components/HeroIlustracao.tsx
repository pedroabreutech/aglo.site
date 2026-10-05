const LARGURA = 420;
const ALTURA = 280;

type Ponto = { x: number; y: number; r: number };

// Gerador com semente fixa: a ilustração sai igual em todo build.
function gerador(semente: number) {
  let estado = semente;
  return () => {
    estado = (estado * 1664525 + 1013904223) % 4294967296;
    return estado / 4294967296;
  };
}

function gerarMultidao(): Ponto[] {
  const aleatorio = gerador(42);
  const pontos: Ponto[] = [];
  for (let i = 0; i < 170; i += 1) {
    // Mais gente embaixo e no centro, como numa foto em perspectiva.
    const profundidade = Math.sqrt(aleatorio());
    const y = 70 + profundidade * (ALTURA - 90);
    const espalhamento = 0.55 + profundidade * 0.45;
    const x = LARGURA / 2 + (aleatorio() - 0.5) * LARGURA * espalhamento;
    pontos.push({ x, y, r: 2.2 + profundidade * 3 });
  }
  return pontos;
}

const multidao = gerarMultidao();

export function HeroIlustracao() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-[#E6EFF8] to-white shadow-sm">
      <svg viewBox={`0 0 ${LARGURA} ${ALTURA}`} className="block w-full" aria-hidden="true">
        {multidao.map((ponto, indice) => (
          <g key={indice}>
            <circle cx={ponto.x} cy={ponto.y} r={ponto.r * 2.2} fill="#94A3B8" fillOpacity="0.25" />
            <circle cx={ponto.x} cy={ponto.y} r={ponto.r} fill={indice % 9 === 0 ? "#F97316" : "#137FEC"} />
          </g>
        ))}
      </svg>
      <div className="absolute left-4 top-4 rounded-lg bg-slate-900/85 px-3 py-2 text-white shadow">
        <p className="text-[11px] uppercase tracking-wide text-slate-300">Total estimado</p>
        <p className="text-xl font-bold">{multidao.length} pessoas</p>
      </div>
    </div>
  );
}
