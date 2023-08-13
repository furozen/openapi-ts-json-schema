import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import $RefParser from '@apidevtools/json-schema-ref-parser';
import YAML from 'yaml';
import get from 'lodash.get';
import {
  clearFolder,
  generateJsonSchemaFiles,
  JSONSchema,
  convertOpenApiToJsonSchema,
  convertOpenApiParameters,
} from './utils';

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
  const jsonOpenApiSchema: Record<string, any> = YAML.parse(openApiSchema);
  // Resolve external/remote references (keeping $refs)
  const bundledOpenApiSchema = await $RefParser.bundle(jsonOpenApiSchema);
  const initialJsonSchema = convertOpenApiToJsonSchema(bundledOpenApiSchema);
  // Replace $refs
  const dereferencedJsonSchema = await $RefParser.dereference(
    initialJsonSchema,
    {
      dereference: {
        // @ts-expect-error onDereference seems not to be properly typed
        onDereference: (path, value) => {
          /**
           * Add commented out $ref prop with:
           * https://github.com/kaelzhang/node-comment-json
           */
          value[Symbol.for('before')] = [
            {
              type: 'LineComment',
              value: ` $ref: "${path}"`,
            },
          ];
        },
      },
    },
  );
  const jsonSchema = convertOpenApiParameters(dereferencedJsonSchema);

  for (const definitionPath of definitionPathsToGenerateFrom) {
    const schemas = get(jsonSchema, definitionPath);
    const schemasOutputPath = path.resolve(outputPath, definitionPath);
    if (schemas) {
      await generateJsonSchemaFiles({
        schemas,
        outputPath: schemasOutputPath,
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
