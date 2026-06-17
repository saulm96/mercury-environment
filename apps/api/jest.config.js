/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/__tests__/**/*.spec.ts'],
  moduleNameMapper: {
    '^@mercury/shared$': '<rootDir>/../../packages/shared/src',
  },
};
