export const blockedWords = [
  "select",
  "insert",
  "update",
  "delete",
  "relation",
  "sql",
  "database",
  "users",
  "roles",
  "companies",
  "join",
  "where",
  "limit",
  "constraint",
  "violates",
];

export const getSanitizedErrorMessage = (error: unknown, defaultMessage: string): string => {
  if (!(error instanceof Error) || !error.message) {
    return defaultMessage;
  }

  const message = error.message.toLowerCase();
  const isBackendError = blockedWords.some((word) => message.includes(word));

  if (isBackendError) {
    return defaultMessage;
  }

  return error.message;
};
