/**
 * JSON.stringify replacer
 * Replace circular references with {}
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cyclic_object_value#circular_references
 */
export function getCircularReplacer(): (
  key: string,
  value: unknown,
) => unknown {
  const ancestors: unknown[] = [];
  return function (this: unknown, key: string, value: unknown) {
    if (typeof value !== 'object' || value === null) {
      return value;
    }

    // `this` is the object that value is contained in,
    // i.e., its direct parent.
    while (ancestors.length > 0 && ancestors.at(-1) !== this) {
      ancestors.pop();
    }

    // @NOTE Should we make recursion depth configurable?
    if (ancestors.includes(value)) {
      return {};
    }

    ancestors.push(value);
    return value;
  };
}
