import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'node:path';
import $RefParser from '@apidevtools/json-schema-ref-parser';
import YAML from 'yaml';
import get from 'lodash.get';
import {
  clearFolder,
  makeJsonSchemaFiles,
  REF_SYMBOL,
  convertOpenApiToJsonSchema,
  convertOpenApiParameters,
  addSchemaToMetaData,
  pathToRef,
} from './utils';
import type { SchemaPatcher, SchemaMetaDataMap, JSONSchema } from './types';

export async function openapiToTsJsonSchema({
  openApiSchema: openApiSchemaRelative,
  definitionPathsToGenerateFrom,
  schemaPatcher,
  outputPath: providedOutputPath,
  silent,
  experimentalImportRefs = false,
}: {
  openApiSchema: string;
  definitionPathsToGenerateFrom: string[];
  schemaPatcher?: SchemaPatcher;
  outputPath?: string;
  silent?: boolean;
  experimentalImportRefs?: boolean;
}): Promise<{ outputPath: string; metaData: { schemas: SchemaMetaDataMap } }> {
  if (definitionPathsToGenerateFrom.length === 0 && !silent) {
    console.log(
      `[openapi-ts-json-schema] ⚠️ No schemas will be generated since definitionPathsToGenerateFrom option is empty`,
    );
  }

  definitionPathsToGenerateFrom.forEach((defPath) => {
    if (path.isAbsolute(defPath)) {
      throw new Error(
        `[openapi-ts-json-schema] "definitionPathsToGenerateFrom" must be an array of relative paths. "${defPath}" found.`,
      );
    }
  });

  const openApiSchemaPath = path.resolve(openApiSchemaRelative);
  if (!existsSync(openApiSchemaPath)) {
    throw new Error(
      `[openapi-ts-json-schema] Provided OpenAPI definition path doesn't exist: ${openApiSchemaPath}`,
    );
  }

  const outputPath =
    providedOutputPath ??
    path.resolve(path.dirname(openApiSchemaPath), 'schemas-autogenerated');

  await clearFolder(outputPath);

  const openApiSchema = await fs.readFile(openApiSchemaPath, 'utf-8');
  const jsonOpenApiSchema: Record<string, any> = YAML.parse(openApiSchema);
  // Resolve/inline remote and URL $ref's (keeping local ones "#/...")
  const bundledOpenApiSchema = await $RefParser.bundle(jsonOpenApiSchema);
  const initialJsonSchema = convertOpenApiToJsonSchema(bundledOpenApiSchema);

  const inlinedRefs: Map<string, JSONSchema> = new Map();
  const dereferencedJsonSchema = await $RefParser.dereference(
    initialJsonSchema,
    {
      dereference: {
        // @ts-expect-error onDereference seems not to be properly typed
        onDereference: (ref, inlinedSchema) => {
          /**
           * Mark inlined refs with a "REF_SYMBOL" prop to replace them
           * in case experimentalImportRefs option is true
           */
          inlinedSchema[REF_SYMBOL] = ref;

          /**
           * Add a $ref comment to each inlined schema with the original ref value. Using:
           * https://github.com/kaelzhang/node-comment-json
           */
          inlinedSchema[Symbol.for('before')] = [
            {
              type: 'LineComment',
              value: ` $ref: "${ref}"`,
            },
          ];

          // Keep track of inline refs
          inlinedRefs.set(ref, inlinedSchema);
        },
      },
    },
  );

  const jsonSchema = convertOpenApiParameters(dereferencedJsonSchema);
  const schemaMetaDataMap: SchemaMetaDataMap = new Map();

  // Generate schema meta info for inlined refs, first
  if (experimentalImportRefs) {
    for (const [ref, schema] of inlinedRefs) {
      addSchemaToMetaData({
        id: ref,
        schemaMetaDataMap,
        schema,
        outputPath,
        schemaPatcher,
        experimentalImportRefs,
        isRef: true,
      });
    }
  }

  // Generate schema meta info for user requested schemas
  for (const definitionPath of definitionPathsToGenerateFrom) {
    const definitionSchemas = get(jsonSchema, definitionPath);
    for (const schemaName in definitionSchemas) {
      // Create expected OpenAPI ref
      const id = pathToRef({
        schemaRelativeDirName: definitionPath,
        schemaName,
      });

      addSchemaToMetaData({
        id,
        schemaMetaDataMap,
        schema: definitionSchemas[schemaName],
        outputPath,
        schemaPatcher,
        experimentalImportRefs,
        isRef: false,
      });
    }
  }

  await makeJsonSchemaFiles({
    schemaMetaDataMap,
  });

  if (!silent) {
    console.log(
      `[openapi-ts-json-schema] ✅ JSON schema models generated at ${outputPath}`,
    );
  }

  return { outputPath, metaData: { schemas: schemaMetaDataMap } };
}
