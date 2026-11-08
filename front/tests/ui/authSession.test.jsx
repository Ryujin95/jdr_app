import { useContext } from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthContext } from "../../src/context/AuthContextObject.js";
import { renderWithAppProviders } from "./test-utils.jsx";
import { mockFetch } from "./fetchMock.js";

function jsonResponse(value, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => "application/json" },
    json: async () => value,
    text: async () => JSON.stringify(value),
  };
}

function AuthControls() {
  const { login, token, user, logout } = useContext(AuthContext);

  return (
    <>
      <button type="button" onClick={() => void login("player@example.test", "secret")}>
        Sign in
      </button>
      <output aria-label="Session token">{token || "none"}</output>
      <output aria-label="Session user">{user?.email || "none"}</output>
      <button type="button" onClick={logout}>Sign out</button>
    </>
  );
}

describe("authentication session", () => {
  it("logs in, loads /me, prefetches friends, and then stores the session", async () => {
    const requests = [];
    mockFetch(async (url, init) => {
      requests.push({ url, init });

      if (url.endsWith("/login_check")) return jsonResponse({ token: "test-jwt" });
      if (url.endsWith("/me")) {
        expect(init.headers.Authorization).toBe("Bearer test-jwt");
        expect(JSON.parse(localStorage.getItem("auth"))).toEqual({
          token: "test-jwt",
          user: null,
        });
        return jsonResponse({ id: 7, email: "player@example.test" });
      }
      if (url.endsWith("/friends")) return jsonResponse([]);
      if (url.endsWith("/friends/requests")) {
        return jsonResponse({ incoming: [], outgoing: [] });
      }

      throw new Error(`Unexpected test request: ${url}`);
    }, [
      { url: "/login_check", method: "POST" },
      "/me",
      "/friends",
      "/friends/requests",
    ]);

    renderWithAppProviders(<AuthControls />);
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Session token").textContent).toBe("test-jwt");
      expect(screen.getByLabelText("Session user").textContent).toBe("player@example.test");
    });

    expect(requests.map(({ url }) => url.split("/").slice(-1)[0])).toEqual([
      "login_check",
      "me",
      "friends",
      "requests",
    ]);
    expect(JSON.parse(requests[0].init.body)).toEqual({
      email: "player@example.test",
      password: "secret",
    });
    expect(JSON.parse(localStorage.getItem("auth"))).toEqual({
      token: "test-jwt",
      user: { id: 7, email: "player@example.test" },
    });
  });

  it("restores a stored session from /me and clears it on logout", async () => {
    localStorage.setItem("auth", JSON.stringify({
      token: "saved-jwt",
      user: { id: 7, email: "old@example.test" },
    }));
    const fetchMock = mockFetch(async (url) => {
      if (url.endsWith("/me")) return jsonResponse({ id: 7, email: "player@example.test" });
      if (url.endsWith("/friends")) return jsonResponse([]);
      if (url.endsWith("/friends/requests")) return jsonResponse({ incoming: [], outgoing: [] });
      throw new Error(`Unexpected test request: ${url}`);
    }, ["/me", "/friends", "/friends/requests"]);

    renderWithAppProviders(<AuthControls />);

    await waitFor(() => {
      expect(screen.getByLabelText("Session token").textContent).toBe("saved-jwt");
      expect(screen.getByLabelText("Session user").textContent).toBe("player@example.test");
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });
    expect(JSON.parse(localStorage.getItem("auth"))).toEqual({
      token: "saved-jwt",
      user: { id: 7, email: "player@example.test" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(screen.getByLabelText("Session token").textContent).toBe("none");
    expect(localStorage.getItem("auth")).toBeNull();
  });

  it("clears a persisted session when /me rejects its JWT", async () => {
    localStorage.setItem("auth", JSON.stringify({
      token: "expired-jwt",
      user: { id: 7, email: "player@example.test" },
    }));
    mockFetch(async () => jsonResponse({ message: "Unauthorized" }, 401), ["/me"]);

    renderWithAppProviders(<AuthControls />);

    await waitFor(() => expect(screen.getByLabelText("Session token").textContent).toBe("none"));
    expect(localStorage.getItem("auth")).toBeNull();
  });
});
