export function groupCharactersByClan(characters) {
  const grouped = {};

  for (const char of characters) {
    const clanName =
      char.clan && char.clan.trim() !== "" ? char.clan : "Sans clan";

    if (!grouped[clanName]) grouped[clanName] = [];
    grouped[clanName].push(char);
  }

  return Object.entries(grouped).sort(([a], [b]) =>
    a.localeCompare(b, "fr", { sensitivity: "base" })
  );
}