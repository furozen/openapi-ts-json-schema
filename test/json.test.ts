import path from 'path';
import { describe, it, expect } from 'vitest';
import { importFresh } from './utils';
import { openapiToTsJsonSchema } from '../src';

const fixtures = path.resolve(__dirname, 'fixtures');

describe('JSON openApi input', async () => {
  it('generates expected schemas', async () => {
    const { outputFolder } = await openapiToTsJsonSchema({
      openApiSchema: path.resolve(fixtures, 'json/specs.json'),
      definitionPathsToGenerateFrom: ['components.months'],
      silent: true,
    });

    const januarySchema = await importFresh(
      path.resolve(outputFolder, 'components.months/January'),
    );

    expect(januarySchema.default).toEqual({
      description: 'January description',
      type: 'object',
      required: ['isJanuary'],
      properties: {
        isJanuary: { type: ['string', 'null'], enum: ['yes', 'no', null] },
      },
    });
  });
});