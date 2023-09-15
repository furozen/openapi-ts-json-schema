import path from 'path';
import fs from 'fs/promises';
import { describe, it, expect } from 'vitest';
import { openapiToTsJsonSchema } from '../../src';
import { fastifyTypeProviderPlugin } from '../../src';
import { importFresh } from '../test-utils';
import { formatTypeScript } from '../../src/utils';

const fixtures = path.resolve(__dirname, '../fixtures');

describe('fastifyTypeProviderPlugin plugin', () => {
  it('generates expected file', async () => {
    const { outputPath, metaData } = await openapiToTsJsonSchema({
      openApiSchema: path.resolve(fixtures, 'complex/specs.yaml'),
      outputPath: path.resolve(
        fixtures,
        'complex/schemas-autogenerated-fastifyTypeProviderPlugin',
      ),
      definitionPathsToGenerateFrom: ['components.months', 'paths'],
      refHandling: 'keep',
      silent: true,
    });

    await fastifyTypeProviderPlugin({ outputPath, metaData });

    const actualAsText = await fs.readFile(
      path.resolve(outputPath, 'fastifyTypeProvider.ts'),
      {
        encoding: 'utf8',
      },
    );

    // @TODO find a better way to assert against generated types
    const expectedAsText = await formatTypeScript(`
      import componentsSchemasAnswer from "./components/schemas/Answer";
      import componentsMonthsJanuary from "./components/months/January";
      import componentsMonthsFebruary from "./components/months/February";

      const componentsSchemasAnswerWithId = {
        ...componentsSchemasAnswer,
        $id: "#/components/schemas/Answer",
      } as const;
      const componentsMonthsJanuaryWithId = {
        ...componentsMonthsJanuary,
        $id: "#/components/months/January",
      } as const;
      const componentsMonthsFebruaryWithId = {
        ...componentsMonthsFebruary,
        $id: "#/components/months/February",
      } as const;

      export type References = [
        typeof componentsSchemasAnswerWithId,
        typeof componentsMonthsJanuaryWithId,
        typeof componentsMonthsFebruaryWithId,
      ];

      export const referenceSchemas = [
        componentsSchemasAnswerWithId,
        componentsMonthsJanuaryWithId,
        componentsMonthsFebruaryWithId,
      ]`);

    expect(actualAsText).toBe(expectedAsText);

    // Ref schemas for fastify.addSchema
    const answerSchema = await importFresh(
      path.resolve(outputPath, 'components/schemas/Answer'),
    );
    const januarySchema = await importFresh(
      path.resolve(outputPath, 'components/months/January'),
    );
    const februarySchema = await importFresh(
      path.resolve(outputPath, 'components/months/February'),
    );
    const actualParsed = await importFresh(
      path.resolve(outputPath, 'fastifyTypeProvider'),
    );

    expect(actualParsed.referenceSchemas).toEqual([
      { ...answerSchema.default, $id: '#/components/schemas/Answer' },
      { ...januarySchema.default, $id: '#/components/months/January' },
      { ...februarySchema.default, $id: '#/components/months/February' },
    ]);
  });
});
