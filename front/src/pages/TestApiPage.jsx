import { useState, useContext } from "react";
import { API_URL } from "../config";
import { AuthContext } from "../context/AuthContext";

function TestCharacterCreatePage() {
  const { token } = useContext(AuthContext); // récupère le token comme les autres pages
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const createKennichi = async () => {
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`${API_URL}/admin/characters`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstname: "Kennichi",
          lastname: "Araki",
          nickname: "Ken",
          age: 30,
          biography: "Jeune japonais, ancien sportif boursier à Columbia...",
          strengths: "Courageux, loyal, bon combattant.",
          weaknesses: "Manipulable, faible face à Brooke Fisk.",
          avatarUrl: "/images/kennichi.png",
          isPlayer: true,
          ownerId: 1,
          attributes: {
            strength: 6,
            agility: 4,
            wits: 4,
            empathy: 4,
          },
          skills: [
            { skillId: 1, level: 5 },
            { skillId: 2, level: 5 },
            { skillId: 3, level: 5 },
          ],
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || `Erreur HTTP ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Test création Kennichi</h1>
      <p>Connecte-toi d’abord via ta page Login normale.</p>

      <button onClick={createKennichi}>Créer Kennichi</button>

      {error && <p style={{ color: "red" }}>Erreur: {error}</p>}

      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}

export default TestCharacterCreatePage;
