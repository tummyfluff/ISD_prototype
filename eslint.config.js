const globals = require("globals");

const baseRules = {
  "no-undef": "error",
  "no-unused-vars": [
    "error",
    {
      argsIgnorePattern: "^_",
      varsIgnorePattern: "^_",
      caughtErrorsIgnorePattern: "^_"
    }
  ],
  "no-unreachable": "error",
  "no-redeclare": "error"
};

module.exports = [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "data/runtimeStore.json",
      "data/runtimeStore.json.tmp"
    ]
  },
  {
    files: ["app.js", "modules/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser
      }
    },
    rules: baseRules
  },
  {
    files: ["vite.config.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        ...globals.node
      }
    },
    rules: baseRules
  }
];
