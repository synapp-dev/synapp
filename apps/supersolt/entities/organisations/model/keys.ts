export const organisationsKeys = {
  all: () => ["organisations"] as const,
  access: () => [...organisationsKeys.all(), "access"] as const,
  accessContext: () => [...organisationsKeys.access(), "context"] as const,
};
