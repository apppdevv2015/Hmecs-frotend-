import { LoginResponse, LoginUser, DecodedToken } from "../types/auth.types";

export const getTokenFromResponse = (response: any): string => {
  const loginData = response?.data || response;
  return (
    loginData?.token ||
    loginData?.accessToken ||
    loginData?.access_token ||
    response?.token ||
    response?.accessToken ||
    response?.access_token ||
    response?.admin?.token ||
    response?.data?.admin?.token ||
    response?.company?.token ||
    response?.data?.company?.token ||
    ""
  );
};

export const getUserFromResponse = (response: any): LoginUser | undefined => {
  const loginData = response?.data || response;
  return (
    loginData?.user ||
    loginData?.admin ||
    loginData?.company ||
    (response !== loginData ? response : undefined)
  );
};

export const getRoleFromResponse = (response: any, user?: LoginUser): string => {
  const loginData = response?.data || response;
  return (
    user?.role ||
    user?.role_name ||
    user?.roleName ||
    response?.role ||
    response?.role_name ||
    loginData?.role ||
    loginData?.role_name ||
    ""
  );
};

export const getCompanyIdFromLogin = (
  loginData: LoginResponse["data"] | LoginResponse,
  apiUser?: LoginUser,
  decodedToken?: DecodedToken | null,
) => {
  return (
    apiUser?.companyId ||
    loginData?.companyId ||
    loginData?.company?.companyId ||
    String(loginData?.company?.id || "") ||
    decodedToken?.companyId ||
    decodedToken?.user?.companyId ||
    decodedToken?.data?.companyId ||
    decodedToken?.data?.user?.companyId ||
    // Safe fallbacks to older key name just in case
    apiUser?.company_id ||
    loginData?.company_id ||
    loginData?.company?.company_id ||
    decodedToken?.company_id ||
    decodedToken?.user?.company_id ||
    decodedToken?.data?.company_id ||
    decodedToken?.data?.user?.company_id ||
    ""
  );
};

export const getFinalUser = (
  response: LoginResponse,
  decodedToken: DecodedToken | null,
  normalizedRole: string,
  emailInput: string,
): LoginUser => {
  const loginData = response?.data || response;
  const apiUser = loginData?.user || loginData?.admin || loginData?.company;
  const companyId = getCompanyIdFromLogin(loginData, apiUser, decodedToken);

  const fullName = `${apiUser?.first_name || ""} ${apiUser?.last_name || ""}`.trim();
  const fallbackName = apiUser?.name || fullName || apiUser?.email || "User";

  return {
    id:
      apiUser?.id ||
      decodedToken?.id ||
      decodedToken?.user?.id ||
      decodedToken?.data?.id ||
      decodedToken?.data?.user?.id,

    role: normalizedRole,
    role_name: apiUser?.role_name,
    role_id: apiUser?.role_id,
    companyId,

    email:
      decodedToken?.email ||
      decodedToken?.user?.email ||
      decodedToken?.data?.email ||
      decodedToken?.data?.user?.email ||
      apiUser?.email ||
      emailInput,

    name:
      decodedToken?.name ||
      decodedToken?.user?.name ||
      decodedToken?.data?.name ||
      decodedToken?.data?.user?.name ||
      apiUser?.name ||
      fallbackName,

    first_name: apiUser?.first_name,
    last_name: apiUser?.last_name,

    companyName:
      decodedToken?.companyName ||
      decodedToken?.user?.companyName ||
      apiUser?.companyName ||
      apiUser?.company_name,

    company:
      decodedToken?.company ||
      decodedToken?.user?.company ||
      apiUser?.company ||
      apiUser?.company_name,
  };
};
