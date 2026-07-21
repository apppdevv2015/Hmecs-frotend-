import {
  getTokenFromResponse,
  getUserFromResponse,
  getRoleFromResponse,
  getCompanyIdFromLogin,
} from "../utils/authParser";

describe("authParser Utilities - Unit Tests (Jest)", () => {
  it("should correctly extract token from different response structures", () => {
    const directResponse = { token: "direct_token_123" };
    const nestedDataResponse = { data: { token: "nested_token_456" } };
    const accessTokenResponse = { accessToken: "access_token_789" };

    expect(getTokenFromResponse(directResponse)).toBe("direct_token_123");
    expect(getTokenFromResponse(nestedDataResponse)).toBe("nested_token_456");
    expect(getTokenFromResponse(accessTokenResponse)).toBe("access_token_789");
  });

  it("should extract the correct user object", () => {
    const userPayload = { id: 1, email: "user@test.com" };
    const directUserResponse = { user: userPayload };
    const nestedUserResponse = { data: { user: userPayload } };

    expect(getUserFromResponse(directUserResponse)).toEqual(userPayload);
    expect(getUserFromResponse(nestedUserResponse)).toEqual(userPayload);
  });

  it("should resolve the correct role mapping", () => {
    const user = { role: "company_admin" };
    const directResponse = { role: "operator" };

    expect(getRoleFromResponse(directResponse, user)).toBe("company_admin");
    expect(getRoleFromResponse(directResponse, undefined)).toBe("operator");
  });

  it("should prioritize companyId correctly from login response layers", () => {
    const loginData = { companyId: "company_from_login" };
    const apiUser = { companyId: "company_from_user" };
    const decodedToken = { companyId: "company_from_token" };

    expect(getCompanyIdFromLogin(loginData, apiUser, decodedToken)).toBe("company_from_user");
    expect(getCompanyIdFromLogin(undefined, undefined, decodedToken)).toBe("company_from_token");
    expect(getCompanyIdFromLogin(loginData, undefined, null)).toBe("company_from_login");
  });
});
