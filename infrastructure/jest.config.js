module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test', '<rootDir>/lib/lambdas/__tests__'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  // setupFilesAfterEnv: ['aws-cdk-lib/testhelpers/jest-autoclean'],
};
