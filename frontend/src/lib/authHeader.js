// {Authorization: "Bearer ..."} when the user is logged in, otherwise {}.
// Anonymous use still works, but nothing is saved to the user's history.
export function authHeader() {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}