module.exports = {
  collectCoverage: true,
  collectCoverageFrom: ['**/*.ts', '!**/coverage/**', '!**/node_modules/**'],
  coverageDirectory: 'coverage',
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
};
