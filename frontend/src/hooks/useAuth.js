import { useAppSelector } from "../app/hooks";
import { getAccessToken, getRole } from "../utils/tokenStorage";

export function useAuth() {
  const authState = useAppSelector((state) => state.auth);
  const token = getAccessToken() || authState.token;
  const role = authState.role || getRole();
  const user = authState.user;

  const isCandidate = role === "candidate";
  const isCompany = role === "company";
  const isRecruiter = role === "recruiter";
  const isAuthenticated = Boolean(token || authState.isAuthenticated);

  return {
    user,
    role,
    token,
    isAuthenticated,
    isCandidate,
    isCompany,
    isRecruiter,
  };
}

export default useAuth;
