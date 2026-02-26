export function formatRelationType(t) {
  const v = String(t || "").trim().toLowerCase();

  if (v === "ami" || v === "friend") return "Ami";
  if (v === "ennemi" || v === "enemy") return "Ennemi";
  if (v === "neutre" || v === "neutral" || v === "") return "Neutre";

  return v.charAt(0).toUpperCase() + v.slice(1);
}

export function normalizeTypeForApi(t) {
  const v = String(t || "").trim().toLowerCase();

  if (v === "ami") return "ami";
  if (v === "ennemi") return "ennemi";

  return "neutral";
}