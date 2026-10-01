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
    product: "Prêt Essentiel (Taux 8,5%)",
    content:
      "J’avais besoin d’un fonds de roulement rapide avant la période des fêtes pour renouveler mon stock de tissus. La validation a pris moins de 48 heures, le dépôt de garantie de 10% a été restitué sans souci une fois le prêt soldé. Une vraie délivrance !",
    initials: "AK",
  },
  {
    name: "Moussa Diop",
    role: "Artisan menuisier métallique",
    city: "Dakar, Sénégal",
    amount: "3 500 000 FCFA",
    product: "Prêt Croissance (Taux 5%)",
    content:
      "Le taux de 5% par an pour le Prêt Croissance est imbattable dans la région. Grâce à ces fonds, j’ai pu acquérir deux machines de découpe et embaucher deux apprentis. Tout est suivi depuis mon téléphone avec un code PIN sécurisé.",
    initials: "MD",
  },
  {
    name: "Bertrand Gnacadja",
    role: "Gérant supérette & distribution",
    city: "Cotonou, Bénin",
    amount: "2 000 000 FCFA",
    product: "Prêt Croissance (Taux 5%)",
    content:
      "Pas de paperasse interminable ni de démarches compliquées. La clarté des conditions et le dépôt de garantie allégé à 5% m’ont convaincu. Le service client répond rapidement et tout est transparent.",
    initials: "BG",
  },
];

function TestimonialsStats() {
  return (
    <div className="mx-auto mt-14 grid max-w-5xl grid-cols-2 gap-x-8 gap-y-8 sm:gap-x-10 lg:grid-cols-4">
      <div className="flex flex-col items-start border-l border-border/80 pl-5 sm:pl-7">
        <div className="inline-flex items-center justify-center rounded-2xl border border-border/60 bg-card/90 px-4 py-2.5 shadow-sm backdrop-blur-sm sm:px-5 sm:py-3">
          <p className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            98<span className="font-extrabold text-accent">%</span>
          </p>
        </div>
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs">
          Clients satisfaits
        </p>
      </div>

      <div className="flex flex-col items-start border-l border-border/80 pl-5 sm:pl-7">
        <div className="inline-flex items-center justify-center rounded-2xl border border-border/60 bg-card/90 px-4 py-2.5 shadow-sm backdrop-blur-sm sm:px-5 sm:py-3">
          <p className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            24-48<span className="font-extrabold text-accent">h</span>
          </p>
        </div>
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs">
          Délai moyen de réponse
        </p>
      </div>

      <div className="flex flex-col items-start border-l border-border/80 pl-5 sm:pl-7">
        <div className="inline-flex items-center justify-center rounded-2xl border border-border/60 bg-card/90 px-4 py-2.5 shadow-sm backdrop-blur-sm sm:px-5 sm:py-3">
          <p className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            5% <span className="font-extrabold text-accent">-</span> 8,5%
          </p>
        </div>
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs">
          Taux annuels fixes
        </p>
      </div>

      <div className="flex flex-col items-start border-l border-border/80 pl-5 sm:pl-7">
        <div className="inline-flex items-center justify-center rounded-2xl border border-border/60 bg-card/90 px-4 py-2.5 shadow-sm backdrop-blur-sm sm:px-5 sm:py-3">
          <p className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            100<span className="font-extrabold text-accent">%</span>
          </p>
        </div>
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs">
          Restitution garantie
        </p>
      </div>
    </div>
  );
}

function TestimonialItem({ item }: { item: Testimonial }) {
  return (
    <div className="relative flex min-w-[280px] flex-1 snap-center flex-col justify-between rounded-[32px] border border-border/75 bg-card/90 p-8 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-card sm:min-w-0 sm:p-10">
      <blockquote className="font-display text-[17px] font-normal leading-relaxed text-foreground sm:text-[18px]">
        “{item.content}”
      </blockquote>

      <div className="mt-8 flex items-center gap-3.5 sm:mt-10">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full border border-border/70 bg-white font-display text-xs font-bold uppercase tracking-wider text-foreground shadow-sm">
          {item.initials}
        </div>
        <div className="min-w-0">
          <h4 className="truncate font-display text-base font-bold text-foreground">{item.name}</h4>
          <p className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {item.role} — {item.city.split(",")[0]}
          </p>
        </div>
      </div>
    </div>
  );
}

export function LandingTestimonials() {
  return (
    <section
      id="avis"
      className="relative overflow-hidden border-t border-border/70 bg-muted/30 py-16 sm:py-20 lg:py-28"
    >
      {/* Halo d'ambiance subtil */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -z-0 size-[600px] -translate-x-1/2 rounded-full bg-accent/5 blur-3xl"
        aria-hidden="true"
      />

      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center rounded-full bg-finance-soft px-3 py-1 text-xs font-bold text-accent">
            <span>Retours d’expérience</span>
          </div>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Ils financent leurs projets avec nous
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            Découvrez comment nos solutions de microfinance accompagnent au quotidien le
            développement d’entrepreneurs et de familles dans la région.
          </p>
        </div>

        <TestimonialsStats />

        <div className="mt-12 flex gap-6 overflow-x-auto pb-4 pt-2 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0">
          {testimonials.map((item, index) => (
            <TestimonialItem key={index} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
