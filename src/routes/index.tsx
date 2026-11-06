import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, FileText, Receipt, ShieldCheck, Users, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CA FirmHub — Run your CA practice in one place" },
      { name: "description", content: "Client master, engagements, statutory compliance calendar, GST invoicing and a secure client portal for CA firms and practitioners." },
      { property: "og:title", content: "CA FirmHub — Run your CA practice in one place" },
      { property: "og:description", content: "Clients, compliance deadlines, billing and client documents for Indian CA firms." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Users, t: "Client ledger", d: "PAN, GSTIN, entity type and contacts for every client." },
  { icon: CalendarClock, t: "Statute calendar", d: "GST, TDS, ITR, tax audit and ROC due dates generated per client." },
  { icon: Receipt, t: "GST billing", d: "Invoices with GST, part-payments and receivables ageing." },
  { icon: FileText, t: "Document register", d: "Inward and outward register with status tracking." },
  { icon: Inbox, t: "Client portal", d: "Request documents, collect uploads and answer queries." },
  { icon: ShieldCheck, t: "Role-based access", d: "Admin, team leader, member and client views." },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="bg-ink text-primary-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="font-display text-xl font-semibold">FirmHub<span className="text-brass">.</span></div>
          <Button asChild variant="secondary" size="sm"><Link to="/auth">Sign in</Link></Button>
        </div>
        <div className="mx-auto max-w-6xl px-6 pb-24 pt-16">
          <p className="mb-4 text-sm uppercase tracking-[0.2em] text-brass">For Chartered Accountants</p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-tight md:text-6xl">
            Every client, deadline and invoice — in one ledger.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-primary-foreground/75">
            CA FirmHub brings your client records, compliance calendar, office registers and billing together, with a portal your clients can actually use.
          </p>
          <div className="mt-10 flex gap-3">
            <Button asChild size="lg" className="bg-brass text-brass-foreground hover:bg-brass/90"><Link to="/auth">Create your firm</Link></Button>
          </div>
        </div>
      </header>
      <section className="mx-auto grid max-w-6xl gap-px overflow-hidden rounded-lg border bg-border px-0 -mt-12 sm:grid-cols-2 lg:grid-cols-3 shadow-card">
        {features.map((f) => (
          <div key={f.t} className="bg-card p-7">
            <f.icon className="size-5 text-brass" />
            <h3 className="mt-4 text-lg font-semibold">{f.t}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
          </div>
        ))}
      </section>
      <footer className="py-12 text-center text-xs text-muted-foreground">CA FirmHub</footer>
    </div>
  );
}
