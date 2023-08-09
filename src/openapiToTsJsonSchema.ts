import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fromSchema } from '@openapi-contrib/openapi-schema-to-json-schema';
import $RefParser from '@apidevtools/json-schema-ref-parser';
import YAML from 'yaml';
import get from 'lodash.get';
import { clearFolder, generateJsonSchemaFiles, JSONSchema } from './utils';

export async function openapiToTsJsonSchema({
  openApiSchema: openApiSchemaRelative,
  definitionPathsToGenerateFrom = [],
  schemaPatcher,
  outputPath: providedOutputPath,
  silent,
}: {
  openApiSchema: string;
  definitionPathsToGenerateFrom: string[];
  schemaPatcher?: (params: { schema: JSONSchema }) => void;
  outputPath?: string;
  silent?: boolean;
}) {
  if (definitionPathsToGenerateFrom.length === 0 && !silent) {
    console.log(
      `[openapi-ts-json-schema] ⚠️ No schemas will be generated since definitionPathsToGenerateFrom option is empty`,
    );
  }

  const openApiSchemaPath = path.resolve(openApiSchemaRelative);
  if (!existsSync(openApiSchemaPath)) {
    throw new Error(
      `Provided OpenAPI definition path doesn't exist: ${openApiSchemaPath}`,
    );
  }

  const outputPath =
    providedOutputPath ??
    path.resolve(path.dirname(openApiSchemaPath), 'schemas-autogenerated');

  await clearFolder(outputPath);

  const openApiSchema = await fs.readFile(openApiSchemaPath, 'utf-8');
  const jsonOpenApiSchema = YAML.parse(openApiSchema);
  // @NOTE We are using a JSONschema resolver on an OpenApi file :)
  const dereferencedOpenApiSchema = await $RefParser.dereference(
    jsonOpenApiSchema,
  );

  // @NOTE paths schema is converted by default
  const jsonSchema = fromSchema(dereferencedOpenApiSchema, {
    definitionKeywords: definitionPathsToGenerateFrom,
  });

  for (const definitionPath of definitionPathsToGenerateFrom) {
    const schemas = get(jsonSchema, definitionPath);
    const schemasoutputPath = path.resolve(outputPath, definitionPath);
    if (schemas) {
      await generateJsonSchemaFiles({
        schemas,
        outputPath: schemasoutputPath,
        schemaPatcher,
      });
    }
  }

  if (!silent) {
    console.log(
      `[openapi-ts-json-schema] ✅ JSON schema models generated at ${outputPath}`,
    );
  }
  return { outputPath };
}
