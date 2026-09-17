import { Star, Download, Share2, Search, ChevronLeft, ThumbsUp, Check } from "lucide-react";
import { useState } from "react";

export type Review = {
  name: string;
  avatar: string;
  rating: number;
  date: string;
  text: string;
  likes: number;
  devReply?: string;
};

export type PlayFakeData = {
  name: string;
  developer: string;
  icon: string;
  rating: string;
  reviewsCount: string;
  downloads: string;
  ageRating: string;
  shortDescription: string;
  longDescription: string;
  whatsNew: string;
  badges: string[];
  screenshots: string[];
  stars: number[];
  reviews: Review[];
};

export const defaultPlayFake: PlayFakeData = {
  name: "Meu App",
  developer: "Estúdio Digital",
  icon: "https://play-lh.googleusercontent.com/6nGYQz_pf8pE0Mw3nJ6FyQs2tGg2Xt2hXk3rP0B2b0c",
  rating: "4.8",
  reviewsCount: "1 mi",
  downloads: "10 mi+",
  ageRating: "Livre",
  shortDescription: "O jeito mais simples de resolver tudo pelo celular.",
  longDescription:
    "Tudo o que você precisa em um só lugar: rápido, seguro e feito para o dia a dia. Acompanhe, organize e receba notificações na hora certa.",
  whatsNew:
    "• Correções de estabilidade\n• App mais rápido ao abrir\n• Novo visual na tela inicial",
  badges: ["Escolha do editor", "Sem anúncios"],
  screenshots: [],
  stars: [82, 11, 4, 1, 2],
  reviews: [
    {
      name: "Camila Ferreira",
      avatar: "https://i.pravatar.cc/100?img=47",
      rating: 5,
      date: "há 2 dias",
      text: "Funciona muito bem, resolvi tudo em minutos. Recomendo demais!",
      likes: 214,
      devReply: "Obrigado pelo carinho, Camila! Seguimos melhorando.",
    },
    {
      name: "Rodrigo Alves",
      avatar: "https://i.pravatar.cc/100?img=12",
      rating: 4,
      date: "há 1 semana",
      text: "Bom app, só demora um pouco pra abrir no meu celular antigo.",
      likes: 37,
    },
    {
      name: "Juliana Prado",
      avatar: "https://i.pravatar.cc/100?img=32",
      rating: 5,
      date: "há 3 semanas",
      text: "Interface limpa e fácil. Uso todo dia.",
      likes: 96,
    },
  ],
};

export function PlayFakePreview({ data }: { data: PlayFakeData }) {
  const [installing, setInstalling] = useState<"idle" | "loading" | "done">("idle");
  const [progress, setProgress] = useState(0);

  const install = () => {
    if (installing !== "idle") return;
    setInstalling("loading");
    let p = 0;
    const t = setInterval(() => {
      p += Math.random() * 18;
      setProgress(Math.min(100, p));
      if (p >= 100) {
        clearInterval(t);
        setInstalling("done");
      }
    }, 350);
  };

  return (
    <div className="mx-auto w-full max-w-[420px] overflow-hidden rounded-2xl border border-border bg-white text-[#202124] shadow-xl">
      <div className="flex items-center gap-3 border-b border-black/5 px-4 py-3">
        <ChevronLeft className="size-5 text-[#5f6368]" />
        <div className="flex flex-1 items-center gap-2 rounded-full bg-[#f1f3f4] px-3 py-2">
          <Search className="size-4 text-[#5f6368]" />
          <span className="text-sm text-[#5f6368]">Pesquisar apps e jogos</span>
        </div>
      </div>

      <div className="space-y-5 p-4">
        <div className="flex gap-4">
          {data.icon && (
            <img src={data.icon} alt={data.name} className="size-20 rounded-2xl object-cover" />
          )}
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold">{data.name}</h2>
            <p className="text-sm font-medium text-[#01875f]">{data.developer}</p>
            <p className="text-xs text-[#5f6368]">Compras no app</p>
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x divide-black/10 text-center">
          <div>
            <p className="flex items-center justify-center gap-1 text-sm font-semibold">
              {data.rating} <Star className="size-3 fill-current" />
            </p>
            <p className="text-xs text-[#5f6368]">{data.reviewsCount} avaliações</p>
          </div>
          <div>
            <p className="text-sm font-semibold">{data.downloads}</p>
            <p className="text-xs text-[#5f6368]">Downloads</p>
          </div>
          <div>
            <p className="text-sm font-semibold">{data.ageRating}</p>
            <p className="text-xs text-[#5f6368]">Classificação</p>
          </div>
        </div>

        <button
          onClick={install}
          className="w-full rounded-lg bg-[#01875f] py-2.5 text-sm font-semibold text-white"
        >
          {installing === "idle" && "Instalar"}
          {installing === "loading" && `Baixando ${Math.round(progress)}%`}
          {installing === "done" && "Abrir"}
        </button>
        {installing === "loading" && (
          <div className="h-1 w-full rounded bg-black/10">
            <div className="h-1 rounded bg-[#01875f]" style={{ width: `${progress}%` }} />
          </div>
        )}

        <div className="flex gap-4 text-xs text-[#01875f]">
          <span className="flex items-center gap-1">
            <Share2 className="size-3" /> Compartilhar
          </span>
          <span className="flex items-center gap-1">
            <Download className="size-3" /> Adicionar à lista
          </span>
        </div>

        {data.badges.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {data.badges.map((b) => (
              <span
                key={b}
                className="flex items-center gap-1 rounded-full bg-[#e6f4ea] px-3 py-1 text-xs font-medium text-[#01875f]"
              >
                <Check className="size-3" /> {b}
              </span>
            ))}
          </div>
        )}

        {data.screenshots.length > 0 && (
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4">
            {data.screenshots.map((s, i) => (
              <img
                key={i}
                src={s}
                alt={`Imagem ${i + 1}`}
                className="h-56 w-32 shrink-0 snap-start rounded-xl object-cover"
              />
            ))}
          </div>
        )}

        <section>
          <h3 className="mb-1 font-semibold">Sobre o app</h3>
          <p className="text-sm text-[#5f6368]">{data.shortDescription}</p>
          <p className="mt-2 whitespace-pre-line text-sm">{data.longDescription}</p>
        </section>

        <section>
          <h3 className="mb-1 font-semibold">Novidades</h3>
          <p className="whitespace-pre-line text-sm text-[#5f6368]">{data.whatsNew}</p>
        </section>

        <section>
          <h3 className="mb-2 font-semibold">Avaliações</h3>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-4xl font-semibold">{data.rating}</p>
              <div className="flex text-[#01875f]">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} className="size-3 fill-current" />
                ))}
              </div>
              <p className="text-xs text-[#5f6368]">{data.reviewsCount}</p>
            </div>
            <div className="flex-1 space-y-1">
              {data.stars.map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-2 text-xs text-[#5f6368]">{5 - i}</span>
                  <div className="h-2 flex-1 rounded bg-black/10">
                    <div className="h-2 rounded bg-[#01875f]" style={{ width: `${v}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-5">
            {data.reviews.map((r, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center gap-3">
                  <img src={r.avatar} alt={r.name} className="size-8 rounded-full object-cover" />
                  <span className="text-sm font-medium">{r.name}</span>
                </div>
                <div className="flex items-center gap-2 text-[#01875f]">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={`size-3 ${n <= r.rating ? "fill-current" : "text-black/20"}`}
                    />
                  ))}
                  <span className="text-xs text-[#5f6368]">{r.date}</span>
                </div>
                <p className="text-sm">{r.text}</p>
                <p className="flex items-center gap-2 text-xs text-[#5f6368]">
                  <ThumbsUp className="size-3" /> {r.likes} acharam útil
                </p>
                {r.devReply && (
                  <div className="mt-2 rounded-lg bg-[#f1f3f4] p-3 text-xs">
                    <p className="font-medium">{data.developer}</p>
                    <p className="text-[#5f6368]">{r.devReply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-2 font-semibold">Apps parecidos</h3>
          <div className="flex gap-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="w-20 space-y-1">
                <div className="size-20 rounded-2xl bg-[#f1f3f4]" />
                <p className="truncate text-xs">App {n}</p>
                <p className="flex items-center gap-1 text-[10px] text-[#5f6368]">
                  4.{n + 2} <Star className="size-2 fill-current" />
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export function renderPlayFakeHtml(data: PlayFakeData) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${data.name}</title><style>
body{margin:0;font-family:Roboto,system-ui,sans-serif;background:#fff;color:#202124}
.wrap{max-width:420px;margin:0 auto;padding:16px}
.hd{display:flex;gap:16px}.ic{width:80px;height:80px;border-radius:18px;object-fit:cover}
h2{margin:0;font-size:20px}.dev{color:#01875f;font-weight:600;font-size:14px;margin:4px 0}
.stats{display:flex;text-align:center;margin:20px 0}.stats div{flex:1;border-right:1px solid #eee}.stats div:last-child{border:0}
.stats b{display:block;font-size:14px}.stats span{font-size:12px;color:#5f6368}
button{width:100%;background:#01875f;color:#fff;border:0;border-radius:8px;padding:12px;font-weight:700}
h3{margin:24px 0 8px}p{font-size:14px;line-height:1.5;white-space:pre-line}
.rv{border-top:1px solid #eee;padding:12px 0}.rv img{width:32px;height:32px;border-radius:50%;vertical-align:middle;margin-right:8px}
</style></head><body><div class="wrap">
<div class="hd"><img class="ic" src="${data.icon}" alt=""><div><h2>${data.name}</h2><div class="dev">${data.developer}</div><div style="font-size:12px;color:#5f6368">Compras no app</div></div></div>
<div class="stats"><div><b>${data.rating} ★</b><span>${data.reviewsCount} avaliações</span></div><div><b>${data.downloads}</b><span>Downloads</span></div><div><b>${data.ageRating}</b><span>Classificação</span></div></div>
<button>Instalar</button>
<h3>Sobre o app</h3><p>${data.shortDescription}\n\n${data.longDescription}</p>
<h3>Novidades</h3><p>${data.whatsNew}</p>
<h3>Avaliações</h3>
${data.reviews
  .map(
    (r) =>
      `<div class="rv"><div><img src="${r.avatar}" alt=""><b>${r.name}</b></div><div style="color:#01875f">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)} <span style="color:#5f6368;font-size:12px">${r.date}</span></div><p>${r.text}</p></div>`,
  )
  .join("")}
</div></body></html>`;
}
