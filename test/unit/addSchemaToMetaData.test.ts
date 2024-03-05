import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { addSchemaToMetaData } from '../../src/utils';
import type { SchemaMetaData } from '../../src/types';

describe('addSchemaToMetaData', () => {
  it('generates expected metadata', () => {
    const ref = '#/components/schemas/Foo';
    const schemaMetaDataMap = new Map();
    const outputPath = path.normalize('/absolute/output/path');
    const schema = {
      description: 'Schema description',
      type: 'object' as const,
      required: ['bar'],
      properties: { bar: { type: 'string' } } as const,
    };

    addSchemaToMetaData({
      ref,
      schemaMetaDataMap,
      schema,
      outputPath,
      isRef: true,
    });

    const actual = schemaMetaDataMap.get(ref);
    const expected: SchemaMetaData = {
      isRef: true,
      originalSchema: schema,
      schemaAbsoluteDirName:
        '/absolute/output/path/components/schemas'.replaceAll('/', path.sep),
      schemaAbsoluteImportPath:
        '/absolute/output/path/components/schemas/Foo'.replaceAll(
          '/',
          path.sep,
        ),
      schemaAbsolutePath:
        '/absolute/output/path/components/schemas/Foo.ts'.replaceAll(
          '/',
          path.sep,
        ),
      schemaId: '/components/schemas/Foo',
      schemaUniqueName: 'componentsSchemasFoo',
    };

    expect(actual).toEqual(expected);
  });
});
