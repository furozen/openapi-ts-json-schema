import path from 'path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { openapiToTsJsonSchema } from '../src';

const fixtures = path.resolve(__dirname, 'fixtures');

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementationOnce(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('silent option', async () => {
  it('console.log user messages', async () => {
    const { outputFolder } = await openapiToTsJsonSchema({
      openApiSchema: path.resolve(fixtures, 'mini-referenced/specs.yaml'),
      silent: false,
    });

    expect(console.log).toHaveBeenCalledWith(
      `✅ JSON schema models generated at ${outputFolder}`,
    );
  });
});