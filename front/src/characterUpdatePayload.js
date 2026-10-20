export function buildCharacterUpdateFields(form, initialOwnerUserId) {
  const fields = {
    nickname: String(form.nickname ?? "").trim(),
    firstname: form.firstname ?? "",
    lastname: form.lastname ?? "",
    age: String(form.age ?? ""),
    biography: form.biography ?? "",
    strengths: form.strengths ?? "",
    weaknesses: form.weaknesses ?? "",
    secret: form.secret ?? "",
    clan: form.clan ?? "",
    isPlayer: form.isPlayer ? "true" : "false",
  };

  const currentOwner = String(form.ownerUserId ?? "");
  const initialOwner = String(initialOwnerUserId ?? "");

  if (!form.isPlayer && initialOwner) {
    fields.ownerUserId = "";
  } else if (form.isPlayer && currentOwner !== initialOwner) {
    // An empty value explicitly removes an existing owner; an unchanged value is omitted.
    fields.ownerUserId = currentOwner;
  }

  return fields;
}
