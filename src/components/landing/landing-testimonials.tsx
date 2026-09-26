import { Star } from "lucide-react";

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
    <div className="mt-12 grid grid-cols-2 gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm sm:grid-cols-4 sm:p-8">
      <div className="text-center">
        <p className="font-display text-3xl font-extrabold text-foreground sm:text-4xl">98%</p>
        <p className="mt-1 text-xs font-medium text-muted-foreground">Clients satisfaits</p>
      </div>
      <div className="text-center">
        <p className="font-display text-3xl font-extrabold text-accent sm:text-4xl">24h - 48h</p>
        <p className="mt-1 text-xs font-medium text-muted-foreground">Délai moyen de réponse</p>
      </div>
      <div className="text-center">
        <p className="font-display text-3xl font-extrabold text-foreground sm:text-4xl">
          5% à 8,5%
        </p>
        <p className="mt-1 text-xs font-medium text-muted-foreground">Taux annuels fixes</p>
      </div>
      <div className="text-center">
        <p className="font-display text-3xl font-extrabold text-accent sm:text-4xl">100%</p>
        <p className="mt-1 text-xs font-medium text-muted-foreground">Restitution garantie</p>
      </div>
    </div>
  );
}

function TestimonialItem({ item }: { item: Testimonial }) {
  return (
    <div className="flex flex-col justify-between rounded-3xl border border-border bg-card p-7 shadow-card transition duration-200 hover:border-accent/40 hover:shadow-lift">
      <div>
        <div className="flex items-center gap-1 text-amber-500">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="size-4 fill-amber-500 text-amber-500" />
          ))}
        </div>
        <p className="mt-4 text-sm italic leading-relaxed text-muted-foreground">
          « {item.content} »
        </p>
      </div>

      <div className="mt-6 border-t border-border/70 pt-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-accent/15 font-display text-sm font-bold text-accent">
            {item.initials}
          </div>
          <div>
            <h4 className="font-display text-sm font-bold text-foreground">{item.name}</h4>
            <p className="text-xs text-muted-foreground">
              {item.role} • {item.city}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-xl bg-muted/50 px-3 py-1.5 text-xs">
          <span className="font-semibold text-accent">{item.product}</span>
          <span className="font-bold text-foreground">{item.amount}</span>
        </div>
      </div>
    </div>
  );
}

export function LandingTestimonials() {
  return (
    <section id="avis" className="border-t border-border/70 bg-muted/30 py-20 md:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
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

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {testimonials.map((item, index) => (
            <TestimonialItem key={index} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
