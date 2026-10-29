module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.jsx?$': [
      'babel-jest',
      {
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }]
        ]
      }
    ],
  },
  testMatch: ['**/__tests__/**/*.test.js'],
  moduleFileExtensions: ['js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'lib/**/*.js',
    'pages/api/**/*.js',
    '!**/node_modules/**',
    '!**/.next/**',
    '!lib/scheduler/followupScheduler.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      statements: 55,
      branches: 50,
      functions: 55,
      lines: 55,
    },
  },
  verbose: true,
};
