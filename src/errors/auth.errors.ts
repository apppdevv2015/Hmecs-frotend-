export const AUTH_ERRORS = {
  emailRequired: "Email is required.",
  invalidEmail: "Please enter a valid email address.",
  passwordRequired: "Password is required.",
  firstNameRequired: "First name is required.",
  firstNameMinLength: "First name must be at least 2 characters.",
  lastNameRequired: "Last name is required.",
  companyNameRequired: "Company name is required.",
  phoneRequired: "Phone number is required.",
  invalidPhone: "Please enter a valid 10-digit phone number.",
  passwordTooShort: "Password must be at least 8 characters.",
  passwordRequirements: "Password must contain uppercase, lowercase, number and special character.",
  tokenNotFound: "Token not found in login response.",
  genericSignupFailed: "Signup failed. Please try again.",
  invalidCredentials: "Invalid email or password.",
};

export const translateError = (message: string): string => {
  if (!message) return "";

  const msg = message.toLowerCase();

  if (msg.includes("user with this email already exists") || msg.includes("already exists")) {
    return "User with this email already exists.";
  }
  if (msg.includes("invalid credentials") || msg.includes("invalid email or password")) {
    return AUTH_ERRORS.invalidCredentials;
  }
  if (msg.includes("token not found")) {
    return AUTH_ERRORS.tokenNotFound;
  }
  if (msg.includes("role not allowed") || msg.includes("role_not_allowed")) {
    return "Your role is not allowed to access this portal.";
  }
  if (msg.includes("your account is inactive") || msg.includes("inactive")) {
    return "Your account is inactive. Please wait for Super Admin approval.";
  }
  if (msg.includes("company name already exists")) {
    return "Company name already exists. Please choose a different name.";
  }

  return message;
};
