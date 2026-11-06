import { createFileRoute } from "@tanstack/react-router";
import { ResourcePage } from "@/components/resource-page";
import { ClientImport } from "@/components/client-import";

export const Route = createFileRoute("/_authenticated/clients")({
  head: () => ({ meta: [{ title: "Clients — CA FirmHub" }, { name: "description", content: "Client records and combined client and engagement imports." }, { property: "og:title", content: "Clients — CA FirmHub" }, { property: "og:description", content: "Client records and combined client and engagement imports." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: () => (
    <ResourcePage
      table="clients"
      title="Clients"
      headerExtra={<ClientImport />}
      description="Client master — PAN, GSTIN and contacts."
      orderBy="name"
      ascending
      searchKeys={["name", "pan", "gstin", "contact_person", "contact_email"]}
      filters={{ key: "entity_type", options: ENTITY }}
      fields={[
        { name: "name", label: "Client name", required: true, full: true },
        { name: "entity_type", label: "Entity type", type: "select", options: ENTITY },
        { name: "pan", label: "PAN" },
        { name: "gstin", label: "GSTIN" },
        { name: "contact_person", label: "Contact person" },
        { name: "contact_phone", label: "Phone" },
        { name: "contact_email", label: "Email" },
        { name: "address", label: "Address", type: "textarea" },
      ]}
      transform={(v) => ({ ...v, pan: v["pan"]?.toUpperCase() ?? null, gstin: v["gstin"]?.toUpperCase() ?? null })}
      columns={[
        { key: "name", label: "Name", render: (r) => <span className="font-medium">{r["name"]}</span> },
        { key: "entity_type", label: "Type" },
        { key: "pan", label: "PAN", render: (r) => <span className="tabular">{r["pan"] ?? "—"}</span> },
        { key: "gstin", label: "GSTIN", render: (r) => <span className="tabular">{r["gstin"] ?? "—"}</span> },
        { key: "contact_person", label: "Contact" },
        { key: "contact_phone", label: "Phone" },
      ]}
    />
  ),
});

const ENTITY = ["Individual", "HUF", "Partnership", "LLP", "Private Limited", "Public Limited", "Trust", "Society", "AOP/BOI"];
