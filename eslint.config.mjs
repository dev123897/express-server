import globals from "globals";

export default [
  {files: ["**/*.js"], languageOptions: {sourceType: "commonjs"}},
  {languageOptions: { globals: globals.browser }},
  { rules: {
      "eqeqeq": "error",
      "getter-return": "warn",
      "guard-for-in": "warn",
      "no-await-in-loop": "warn",
      "no-const-assign": "error",
      "no-debugger": "warn",
      "no-irregular-whitespace": "error",
      "no-loss-of-precision": "warn",
      "no-unused-vars": "error",
      "no-use-before-define": "error",
      "no-var": "error",
      "prefer-const": "error",
      "require-await": "error",
      "use-isnan": "warn",
      "valid-typeof": "warn",
    }
  }
];
