import path from 'path';
import { existsSync } from 'fs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { importFresh } from './utils';
import { openapiToTsJsonSchema } from '../src';

const fixtures = path.resolve(__dirname, 'fixtures');

describe('openapiToTsJsonSchema', async () => {
  it('Generates expected JSON schemas', async () => {
    const { outputPath } = await openapiToTsJsonSchema({
      openApiSchema: path.resolve(fixtures, 'complex/specs.yaml'),
      definitionPathsToGenerateFrom: ['paths', 'components.months'],
      silent: true,
    });

    expect(outputPath).toBe(
      path.resolve(fixtures, 'complex/schemas-autogenerated'),
    );

    const januarySchema = await importFresh(
      path.resolve(outputPath, 'components.months/January'),
    );
    const februarySchema = await importFresh(
      path.resolve(outputPath, 'components.months/February'),
    );

    // definition paths get escaped
    const path1 = await importFresh(
      path.resolve(outputPath, 'paths/v1|path-1'),
    );

    expect(januarySchema.default).toEqual({
      description: 'January description',
      type: 'object',
      required: ['isJanuary'],
      properties: {
        isJanuary: { type: ['string', 'null'], enum: ['yes', 'no', null] },
      },
    });

    expect(februarySchema.default).toEqual({
      description: 'February description',
      type: 'object',
      required: ['isFebruary'],
      properties: {
        isFebruary: { type: ['string', 'null'], enum: ['yes', 'no', null] },
      },
    });

    expect(path1.default).toEqual({
      get: {
        responses: {
          '200': {
            description: 'A description',
            content: {
              'application/json': {
                schema: {
                  oneOf: [
                    {
                      description: 'January description',
                      type: 'object',
                      required: ['isJanuary'],
                      properties: {
                        isJanuary: {
                          type: ['string', 'null'],
                          enum: ['yes', 'no', null],
                        },
                      },
                    },
                    {
                      description: 'February description',
                      type: 'object',
                      required: ['isFebruary'],
                      properties: {
                        isFebruary: {
                          type: ['string', 'null'],
                          enum: ['yes', 'no', null],
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
    });
  });

  it('deletes previously generated schemas', async () => {
    const { outputPath } = await openapiToTsJsonSchema({
      openApiSchema: path.resolve(fixtures, 'mini-referenced/specs.yaml'),
      definitionPathsToGenerateFrom: ['components.schemas'],
      silent: true,
    });

    const previouslyGeneratedSchematPath = path.resolve(
      outputPath,
      'components.schemas',
      'Answer.ts',
    );

    expect(existsSync(previouslyGeneratedSchematPath)).toBe(true);

    await openapiToTsJsonSchema({
      openApiSchema: path.resolve(fixtures, 'mini-referenced/specs.yaml'),
      definitionPathsToGenerateFrom: ['components.months'],
      silent: true,
    });
  });

  describe('non existing openAPI definition file', async () => {
    it('throws expected error', async () => {
      await expect(() =>
        openapiToTsJsonSchema({
          openApiSchema: path.resolve(fixtures, 'does-not-exist.yaml'),
          definitionPathsToGenerateFrom: ['components'],
          silent: true,
        }),
      ).rejects.toThrow("Provided OpenAPI definition path doesn't exist:");
    });
  });

  describe('empty "definitionPathsToGenerateFrom" option', async () => {
    beforeEach(() => {
      vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    it('logs expected message', async () => {
      await openapiToTsJsonSchema({
        openApiSchema: path.resolve(fixtures, 'mini-referenced/specs.yaml'),
        definitionPathsToGenerateFrom: [],
      });

      expect(console.log).toHaveBeenCalledWith(
        `[openapi-ts-json-schema] ⚠️ No schemas will be generated since definitionPathsToGenerateFrom option is empty`,
      );
    });
  });
});
