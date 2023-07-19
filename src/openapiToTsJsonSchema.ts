import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { openapiSchemaToJsonSchema } from '@openapi-contrib/openapi-schema-to-json-schema';
import $RefParser from '@apidevtools/json-schema-ref-parser';
import YAML from 'yaml';
import get from 'lodash.get';
import { clearFolder, generateJsonSchemaFiles, JSONSchema } from './utils';

export async function openapiToTsJsonSchema({
  openApiSchema: openApiSchemaRelative,
  definitionPathsToGenerateFrom = [],
  schemaPatcher,
  silent,
}: {
  openApiSchema: string;
  definitionPathsToGenerateFrom?: string[];
  schemaPatcher?: (params: { schema: JSONSchema }) => void;
  silent?: boolean;
}) {
  const openApiSchemaPath = path.resolve(openApiSchemaRelative);
  if (!existsSync(openApiSchemaPath)) {
    throw new Error(
      `Provided OpenAPI definition path doesn't exist: ${openApiSchemaPath}`,
    );
  }

  const outputFolder = path.resolve(
    path.dirname(openApiSchemaPath),
    'schemas-autogenerated',
  );

  await clearFolder(outputFolder);

  const openApiSchema = await fs.readFile(openApiSchemaPath, 'utf-8');
  const jsonOpenApiSchema = YAML.parse(openApiSchema);
  // @NOTE We are using a JSONschema resolver on an OpenApi file :)
  const dereferencedOpenApiSchema = await $RefParser.dereference(
    jsonOpenApiSchema,
  );

  // @NOTE path schema is converted by default
  const jsonSchema = openapiSchemaToJsonSchema(dereferencedOpenApiSchema, {
    definitionKeywords: definitionPathsToGenerateFrom,
  });

  for (const definitionPath of definitionPathsToGenerateFrom) {
    const schemas = get(jsonSchema, definitionPath);
    const schemasOutputFolder = path.resolve(outputFolder, definitionPath);
    if (schemas) {
      await generateJsonSchemaFiles({
        schemas,
        outputFolder: schemasOutputFolder,
        schemaPatcher,
      });
    }
  }

  if (!silent) {
    console.log(`✅ JSON schema models generated at ${outputFolder}`);
  }
  return { outputFolder };
}