export function registerNoteTool(save: (text: string) => boolean): () => void {
  type Context = {
    registerTool: (
      tool: {
        name: string;
        description: string;
        inputSchema: object;
        annotations: object;
        execute: (input: unknown) => unknown;
      },
      options: { signal: AbortSignal },
    ) => void | Promise<void>;
  };
  const context = (document as Document & { modelContext?: Context })
    .modelContext;
  if (!context?.registerTool) return () => {};
  const lifecycle = new AbortController();
  try {
    void Promise.resolve(
      context.registerTool(
        {
          name: 'save_home_note',
          description:
            'Replace the open notebook content and save it on this device. The visible notebook updates to the saved text.',
          inputSchema: {
            type: 'object',
            properties: { text: { type: 'string', maxLength: 100000 } },
            required: ['text'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: true },
          async execute(input: unknown) {
            if (
              !input ||
              typeof input !== 'object' ||
              !('text' in input) ||
              typeof input.text !== 'string' ||
              input.text.length > 100000 ||
              Object.keys(input).length !== 1
            )
              throw new Error(
                'Expected a text string, at most 100000 characters.',
              );
            if (!save(input.text))
              throw new Error('Browser storage unavailable.');
            const length = input.text.length;
            await new Promise<void>((resolve) =>
              requestAnimationFrame(() => resolve()),
            );
            return { saved: true, characters: length };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
  } catch {
    /* Optional API: normal notebook use remains available. */
  }
  return () => lifecycle.abort();
}
