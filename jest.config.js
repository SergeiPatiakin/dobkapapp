const path = require('path')

module.exports = {
  verbose: false,
  preset: 'ts-jest',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    '<rootDir>/src/**/*.{ts}',
  ],
  testPathIgnorePatterns : [
    "<rootDir>/out",
  ],
  setupFilesAfterEnv: ['<rootDir>/jest-setup.js'],
}
