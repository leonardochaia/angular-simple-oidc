
export function spyOnGet<T>(obj: T, property: keyof T) {
  Object.defineProperty(obj, property, { get: () => null, configurable: true });
  return jest.spyOn(obj, property as any, 'get');
}
