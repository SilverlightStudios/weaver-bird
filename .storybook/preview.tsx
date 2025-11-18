import type { Preview } from "@storybook/react";
import type { Decorator } from "@storybook/react";
import React from "react";
import "../src/app.css";

// Global decorator to handle portal components properly in Storybook
const PortalDecorator: Decorator = (Story) => {
  React.useEffect(() => {
    // Add position: relative to the storybook root to create positioning context
    const root = document.getElementById("storybook-root");
    if (root) {
      root.style.position = "relative";
      root.style.isolation = "isolate";
    }

    // Ensure the iframe body has proper positioning context
    document.body.style.position = "relative";
    document.body.style.isolation = "isolate";
  }, []);

  return <Story />;
};

const preview: Preview = {
  decorators: [PortalDecorator],
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    layout: "fullscreen",
    backgrounds: {
      default: "parchment",
      values: [
        { name: "parchment", value: "var(--color-bg)" },
        { name: "slate", value: "#2b2437" },
      ],
    },
  },
};

export default preview;
