export default {
  type: "object",
  required: ["id", "name"],
  properties: {
    id: {
      type: "integer",
      format: "int64",
      minimum: -9223372036854776000,
      maximum: 9223372036854776000,
    },
    name: {
      type: "string",
    },
    tag: {
      type: "string",
    },
  },
} as const;

export const $id = "#/components/schemas/Pet";
