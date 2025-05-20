export default [
  {
    files: ['**/*.js', '**/*.html'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module'
    },
    linterOptions: {
      reportUnusedDisableDirectives: true
    },
    rules: {}
  }
];
