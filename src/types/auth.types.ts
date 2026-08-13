export type LoginUser = {
  id?: string | number;
  role?: string;
  role_name?: string;
  roleName?: string;
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
  name?: string;
  email?: string;
  mobileNumber?: string;
  mobile_number?: string;
  phone?: string;
  companyName?: string;
  company?: string;
  company_name?: string;
  role_id?: string | number;
  companyId?: string;
  company_id?: string;
};

export type LoginResponse = {
  message?: string;
  token?: string;
  accessToken?: string;
  access_token?: string;
  user?: LoginUser;
  admin?: LoginUser;
  company?: LoginUser;
  companyId?: string;
  company_id?: string;
  data?: {
    message?: string;
    token?: string;
    accessToken?: string;
    access_token?: string;
    user?: LoginUser;
    admin?: LoginUser;
    company?: LoginUser;
    companyId?: string;
    company_id?: string;
  };
};

export type DecodedToken = {
  id?: string | number;
  role?: string;
  role_name?: string;
  email?: string;
  name?: string;
  companyName?: string;
  company?: string;
  companyId?: string;
  company_id?: string;
  user?: LoginUser;
  data?: {
    id?: string | number;
    role?: string;
    role_name?: string;
    email?: string;
    name?: string;
    companyId?: string;
    company_id?: string;
    user?: LoginUser;
  };
  roles?: string[];
  exp?: number;
};
