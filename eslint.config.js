// https://docs.expo.dev/guides/using-eslint/
const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = defineConfig([
  globalIgnores(['dist/*', '.expo/*', 'android/*', 'ios/*', 'expo-env.d.ts']),
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    // All user-facing text lives in src/ui/strings.ts.
    files: ['src/app/**/*.tsx', 'src/features/**/*.tsx', 'src/ui/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...[
          'JSXText[value=/\\S/]',
          'JSXElement > JSXExpressionContainer > Literal[value=/\\S/]',
          'JSXElement > JSXExpressionContainer > TemplateLiteral > TemplateElement[value.raw=/\\S/]',
          'JSXElement > JSXExpressionContainer > :matches(LogicalExpression, ConditionalExpression) > Literal[value=/\\S/]',
          'JSXAttribute[name.name=/^(accessibilityLabel|accessibilityHint|label|title|message|placeholder)$/] :matches(Literal[value=/\\S/], TemplateElement[value.raw=/\\S/])',
        ].map((selector) => ({
          selector,
          message: 'Move user-facing text to src/ui/strings.ts.',
        })),
      ],
    },
  },
]);
