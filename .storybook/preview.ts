import type { Preview } from "@storybook/react";
import "../src/app/globals.css";

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ 
        '--font-montserrat': '"Montserrat", sans-serif',
        '--font-oswald': '"Oswald", sans-serif',
        fontFamily: 'var(--font-montserrat)' 
      } as React.CSSProperties}>
        <Story />
      </div>
    ),
  ],
};

export default preview;
