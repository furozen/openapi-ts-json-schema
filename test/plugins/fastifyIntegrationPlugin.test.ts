import path from 'path';
import fs from 'fs/promises';
import { describe, it, expect } from 'vitest';
import { openapiToTsJsonSchema } from '../../src';
import { fastifyIntegrationPlugin } from '../../src';
import { fixtures, makeTestOutputPath } from '../test-utils';
import { formatTypeScript } from '../../src/utils';

describe('fastifyIntegration plugin', () => {
  it('generates expected file', async () => {
    const { outputPath } = await openapiToTsJsonSchema({
      openApiSchema: path.resolve(fixtures, 'complex/specs.yaml'),
      outputPath: makeTestOutputPath('plugin-fastify'),
      definitionPathsToGenerateFrom: ['components.months', 'paths'],
      refHandling: 'keep',
      plugins: [fastifyIntegrationPlugin()],
      silent: true,
    });

    const actualAsText = await fs.readFile(
      path.resolve(outputPath, 'fastify-integration.ts'),
      {
        encoding: 'utf8',
      },
    );

    // @TODO find a better way to assert against generated types
    const expectedAsText = await formatTypeScript(`
      // File autogenerated with "openapi-ts-json-schema". Do not edit :)

      import componentsSchemasAnswer from "./components/schemas/Answer";
      import componentsMonthsJanuary from "./components/months/January";
      import componentsMonthsFebruary from "./components/months/February";

      const componentsSchemasAnswerWithId = {
        ...componentsSchemasAnswer,
        $id: "/components/schemas/Answer",
      } as const;
      const componentsMonthsJanuaryWithId = {
        ...componentsMonthsJanuary,
        $id: "/components/months/January",
      } as const;
      const componentsMonthsFebruaryWithId = {
        ...componentsMonthsFebruary,
        $id: "/components/months/February",
      } as const;

      // Allows json-schema-to-ts to hydrate $refs via the "references" option
      export type RefSchemas = [
        typeof componentsSchemasAnswerWithId,
        typeof componentsMonthsJanuaryWithId,
        typeof componentsMonthsFebruaryWithId,
      ];

      // $ref JSON schemas to be registered with "fastify.addSchema"
      export const refSchemas = [
        componentsSchemasAnswerWithId,
        componentsMonthsJanuaryWithId,
        componentsMonthsFebruaryWithId,
      ]

      // Extra JSON schemas to be registered with "fastify.addSchema"
      export const sharedSchemas = []`);

    expect(actualAsText).toBe(expectedAsText);

    // refSchemas containing only $ref schemas
    const answerSchema = await import(
      path.resolve(outputPath, 'components/schemas/Answer')
    );
    const januarySchema = await import(
      path.resolve(outputPath, 'components/months/January')
    );
    const februarySchema = await import(
      path.resolve(outputPath, 'components/months/February')
    );
    const actual = await import(
      path.resolve(outputPath, 'fastify-integration')
    );

    expect(actual.refSchemas).toEqual([
      { ...answerSchema.default, $id: '/components/schemas/Answer' },
      { ...januarySchema.default, $id: '/components/months/January' },
      { ...februarySchema.default, $id: '/components/months/February' },
    ]);

    expect(actual.sharedSchemas).toEqual([]);
  });

  describe('"sharedSchemasFilter" option', () => {
    it('generates expected file', async () => {
      const { outputPath } = await openapiToTsJsonSchema({
        openApiSchema: path.resolve(fixtures, 'complex/specs.yaml'),
        outputPath: makeTestOutputPath('plugin-fastify'),
        definitionPathsToGenerateFrom: ['components.months', 'paths'],
        refHandling: 'keep',
        plugins: [
          fastifyIntegrationPlugin({
            sharedSchemasFilter: ({ id }) =>
              id.startsWith('/components/months'),
          }),
        ],
        silent: true,
      });

      const actual = await import(
        path.resolve(outputPath, 'fastify-integration')
      );

      // refSchemas containing only $ref schemas
      const answerSchema = await import(
        path.resolve(outputPath, 'components/schemas/Answer')
      );
      const januarySchema = await import(
        path.resolve(outputPath, 'components/months/January')
      );
      const februarySchema = await import(
        path.resolve(outputPath, 'components/months/February')
      );

      expect(actual.refSchemas).toEqual([
        { ...answerSchema.default, $id: '/components/schemas/Answer' },
        { ...januarySchema.default, $id: '/components/months/January' },
        { ...februarySchema.default, $id: '/components/months/February' },
      ]);

      // refSchemas containing only non-$ref schemas
      const marchSchema = await import(
        path.resolve(outputPath, 'components/months/March')
      );

      expect(actual.sharedSchemas).toEqual([
        { ...marchSchema.default, $id: '/components/months/March' },
      ]);
    });
  });
});
