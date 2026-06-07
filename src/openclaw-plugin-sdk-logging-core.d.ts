declare module "openclaw/plugin-sdk/logging-core" {
  export type RedactSensitiveMode = "off" | "tools";
  export type RedactPattern = string | RegExp;

  export function redactSensitiveText(
    text: string,
    options?: {
      mode?: RedactSensitiveMode;
      patterns?: RedactPattern[];
    },
  ): string;
}
