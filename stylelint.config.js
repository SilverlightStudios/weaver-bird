export default {
  extends: ["stylelint-config-standard-scss"],
  rules: {
    // Custom rules can be added here
    "scss/at-rule-no-unknown": [
      true,
      {
        ignoreAtRules: ["tailwind", "apply", "variants", "responsive", "screen"],
      },
    ],
    // Avoid conflicts with CSS modules
    "selector-class-pattern": null,
    "block-no-empty": true,
    "keyframes-name-pattern": null,
    "selector-pseudo-class-no-unknown": [
      true,
      {
        ignorePseudoClasses: ["global", "local"],
      },
    ],
  },
};
