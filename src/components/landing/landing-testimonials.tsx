import { CheckCircle2, Star } from "lucide-react";

interface Testimonial {
  name: string;
  role: string;
  city: string;
  amount: string;
  product: string;
  content: string;
  initials: string;
}

const testimonials: Testimonial[] = [
  {
    name: "Aminata Koné",
    role: "Commerçante textile",
    city: "Abidjan, Côte d’Ivoire",
    amount: "400 000 FCFA",
    product: "Prêt Essentiel (8,5%)",
    content:
      "J’avais besoin d’un fonds de roulement rapide avant les fêtes pour reconstituer mes stocks de pagnes. Le dossier a été traité en moins de 48 heures, et mon dépôt de garantie de 10% a été intégralement débloqué dès la fin du prêt. Une transparence exemplaire.",
    initials: "AK",
  },
  {
    name: "Moussa Diop",
    role: "Artisan menuisier métallique",
    city: "Dakar, Sénégal",
    amount: "3 500 000 FCFA",
    product: "Prêt Croissance (5%)",
    content:
      "Le taux annuel de 5% pour le Prêt Croissance défie toute concurrence dans notre secteur. Cet apport m’a permis de commander deux postes de soudure semi-automatiques et d’embaucher deux apprentis qualifiés.",
    initials: "MD",
  },
  {
    name: "Bertrand Gnacadja",
    role: "Gérant supérette & distribution",
    city: "Cotonou, Bénin",
    amount: "2 000 000 FCFA",
    product: "Prêt Croissance (5%)",
    content:
      "La clarté contractuelle et le dépôt allégé à 5% m’ont immédiatement convaincu. Pas d’intermédiaires ni de frais opaques : chaque mensualité est suivie avec précision depuis le smartphone.",
    initials: "BG",
  },
];

function TestimonialsStats() {
  return (
    <div className="mt-12 grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] sm:grid-cols-4 sm:gap-4 sm:p-8">
      <div className="border-r border-slate-100 pr-3 text-center sm:pr-4">
        <p className="font-display text-2xl font-black text-slate-900 sm:text-4xl">98%</p>
        <p className="mt-1 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Satisfaction
        </p>
      </div>
      <div className="border-r-0 border-slate-100 pr-0 text-center sm:border-r sm:pr-4">
        <p className="font-display text-2xl font-black text-emerald-700 sm:text-4xl">24h - 48h</p>
        <p className="mt-1 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Délai moyen
        </p>
      </div>
      <div className="border-r border-slate-100 pr-3 text-center sm:pr-4">
        <p className="font-display text-2xl font-black text-slate-900 sm:text-4xl">5% à 8,5%</p>
        <p className="mt-1 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Taux fixe / an
        </p>
      </div>
      <div className="text-center">
        <p className="font-display text-2xl font-black text-emerald-700 sm:text-4xl">100%</p>
        <p className="mt-1 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Garantie restituée
        </p>
      </div>
    </div>
  );
}

function TestimonialItem({ item }: { item: Testimonial }) {
  return (
    <div className="flex min-w-[280px] flex-1 snap-center flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition duration-200 hover:border-slate-300 hover:shadow-[0_12px_24px_rgba(15,23,42,0.06)] sm:min-w-0">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-amber-500">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="size-3.5 fill-amber-500 text-amber-500" />
            ))}
          </div>
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
            <CheckCircle2 className="size-3" /> Vérifié
          </span>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-600">« {item.content} »</p>
      </div>

      <div className="mt-6 border-t border-slate-100 pt-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-slate-900 font-display text-xs font-bold text-white">
            {item.initials}
          </div>
          <div>
            <h4 className="font-display text-xs font-extrabold text-slate-900">{item.name}</h4>
            <p className="text-[11px] text-slate-500">
              {item.role} • {item.city}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5 font-mono text-[11px]">
          <span className="font-bold text-slate-800">{item.product}</span>
          <span className="font-extrabold text-emerald-700">{item.amount}</span>
        </div>
      </div>
    </div>
  );
}

export function LandingTestimonials() {
  return (
    <section id="avis" className="border-b border-slate-200/80 bg-white py-16 sm:py-20 lg:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-700">
            <span>Social Proof & Confiance</span>
          </div>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Témoignages d’entrepreneurs financés
          </h2>
          <p className="mt-3 text-sm text-slate-600 sm:text-base">
            Retours d’expérience de professionnels qui ont développé leur activité grâce à nos
            crédits transparents.
          </p>
        </div>

        <TestimonialsStats />

        {/* Carousel horizontal natif sur mobile / Grille 3 colonnes sur desktop */}
        <div className="mt-12 flex gap-4 overflow-x-auto pb-4 pt-2 sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible sm:pb-0">
          {testimonials.map((item, index) => (
            <TestimonialItem key={index} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
