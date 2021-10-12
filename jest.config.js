// jest.config.js
module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  moduleNameMapper: {
    "^angular-simple-oidc/(.*)$": "<rootDir>/dist/angular-simple-oidc/$1"
  }
};
