/**
 * Ambient type declarations for the `input` package (CJS, no types
 * shipped). We only use `text()` and `password()` from the default
 * export — both are simple string prompts.
 */

declare module "input" {
  interface InputModule {
    text(prompt: string): Promise<string>;
    password(prompt: string): Promise<string>;
    confirm(prompt: string): Promise<boolean>;
  }

  const input: InputModule;
  export default input;
}
