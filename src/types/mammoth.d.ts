// mammoth ships no types of its own and there's no @types/mammoth package
// — this declares only the one function this app actually calls
// (convertToHtml), not its full untyped surface.
declare module "mammoth" {
  export interface ConvertResult {
    value: string;
    messages: Array<{ type: string; message: string }>;
  }

  export function convertToHtml(
    input: { buffer: Buffer } | { path: string },
  ): Promise<ConvertResult>;
}
