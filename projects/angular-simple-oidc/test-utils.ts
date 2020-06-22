
export function spyOnGet<T>(obj: T, property: keyof T) {
  Object.defineProperty(obj, property, { get: () => null, configurable: true });
  return spyOnProperty(obj, property, 'get');
}
