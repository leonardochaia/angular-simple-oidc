import 'jest-preset-angular/setup-jest';

export type CustomMockObject<T> =Partial<Record<keyof T, jest.Mock>>;
