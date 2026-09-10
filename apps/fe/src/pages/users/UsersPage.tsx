import { useEffect, useState, type ChangeEvent } from "react";
import { getUsers } from "../../api/users";
import { useAuth } from "../../auth/AuthContext";
import type { User } from "../../types/user";
import "./UsersPage.css";

const SEARCH_DEBOUNCE_MS = 300;

export function UsersPage() {
  const { token } = useAuth();

  const [userNameInput, setUserNameInput] = useState("");
  const [loginCountInput, setLoginCountInput] = useState("");
  const [debouncedUserName, setDebouncedUserName] = useState("");

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedUserName(userNameInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [userNameInput]);

  useEffect(() => {
    if (!token) return;

    const trimmedLoginCount = loginCountInput.trim();
    const loginCount = trimmedLoginCount === "" ? undefined : Number(trimmedLoginCount);
    if (loginCount !== undefined && Number.isNaN(loginCount)) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    getUsers(token, { userName: debouncedUserName || undefined, loginCount })
      .then((data) => {
        if (!cancelled) setUsers(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load users.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, debouncedUserName, loginCountInput]);

  function handleClearFilters() {
    setUserNameInput("");
    setLoginCountInput("");
    setDebouncedUserName("");
  }

  const hasFilters = userNameInput !== "" || loginCountInput !== "";

  return (
    <div>
      <h1 className="users-page__title">Users</h1>
      <p className="users-page__subtitle">Search and filter registered users.</p>

      <div className="users-filters">
        <div className="users-filters__field">
          <label htmlFor="userName-search">Search by username</label>
          <input
            id="userName-search"
            type="text"
            placeholder="e.g. jane"
            value={userNameInput}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setUserNameInput(event.target.value)}
          />
        </div>

        <div className="users-filters__field">
          <label htmlFor="loginCount-filter">Filter by login count</label>
          <input
            id="loginCount-filter"
            type="number"
            min={0}
            placeholder="e.g. 3"
            value={loginCountInput}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setLoginCountInput(event.target.value)}
          />
        </div>

        {hasFilters && (
          <button type="button" className="users-filters__clear" onClick={handleClearFilters}>
            Clear filters
          </button>
        )}
      </div>

      {loading && <p className="users-page__status">Loading users...</p>}
      {!loading && error && <p className="users-page__status">{error}</p>}
      {!loading && !error && users.length === 0 && (
        <p className="users-page__status">No users match your search.</p>
      )}

      {!loading && !error && users.length > 0 && (
        <div className="users-table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Email</th>
                <th>Location</th>
                <th>Login count</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.userName}</td>
                  <td>{user.email}</td>
                  <td>{user.location}</td>
                  <td>{user.loginCount}</td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
