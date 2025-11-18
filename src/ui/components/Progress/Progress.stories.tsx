import type { Meta, StoryObj } from "@storybook/react";
import { useEffect, useState } from "react";
import { Progress } from "./Progress";

const meta = {
  title: "Components/Progress",
  component: Progress,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    value: {
      control: { type: "range", min: 0, max: 100, step: 1 },
    },
    max: {
      control: "number",
    },
    showLabel: {
      control: "boolean",
    },
  },
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: 60,
  },
  render: (args) => (
    <div style={{ width: "400px" }}>
      <Progress {...args} />
    </div>
  ),
};

export const WithLabel: Story = {
  args: {
    value: 75,
    showLabel: true,
  },
  render: (args) => (
    <div style={{ width: "400px" }}>
      <Progress {...args} />
    </div>
  ),
};

export const Animated: Story = {
  render: () => {
    const [progress, setProgress] = useState(13);

    useEffect(() => {
      const timer = setTimeout(() => setProgress(66), 500);
      return () => clearTimeout(timer);
    }, []);

    return (
      <div style={{ width: "400px" }}>
        <Progress value={progress} showLabel />
      </div>
    );
  },
};

export const PackBuilding: Story = {
  render: () => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 1;
        });
      }, 50);

      return () => clearInterval(interval);
    }, []);

    return (
      <div
        style={{
          width: "500px",
          padding: "1.5rem",
          border: "3px solid var(--color-border)",
          borderRadius: "1.6rem 1.6rem 2.3rem 0.4rem",
          background: "var(--color-block)",
          boxShadow: "10px 10px 0 var(--color-ink)",
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-family)",
            fontSize: "1rem",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: "0.5rem",
            fontWeight: "bold",
          }}
        >
          Building Resource Pack
        </h3>
        <p
          style={{
            fontSize: "0.75rem",
            color: "var(--color-text-light)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: "1rem",
          }}
        >
          Processing 1,247 assets...
        </p>
        <Progress value={progress} showLabel />
        <p
          style={{
            marginTop: "0.75rem",
            fontSize: "0.7rem",
            opacity: 0.7,
            textAlign: "center",
          }}
        >
          {progress < 100 ? "Building..." : "Complete!"}
        </p>
      </div>
    );
  },
};

export const ProgressStages: Story = {
  render: () => (
    <div style={{ width: "500px", display: "grid", gap: "1.5rem" }}>
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "0.5rem",
            fontFamily: "var(--font-family)",
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          <span>Empty</span>
          <span style={{ opacity: 0.5 }}>0%</span>
        </div>
        <Progress value={0} />
      </div>

      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "0.5rem",
            fontFamily: "var(--font-family)",
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          <span>Started</span>
          <span style={{ opacity: 0.5 }}>25%</span>
        </div>
        <Progress value={25} />
      </div>

      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "0.5rem",
            fontFamily: "var(--font-family)",
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          <span>Halfway</span>
          <span style={{ opacity: 0.5 }}>50%</span>
        </div>
        <Progress value={50} showLabel />
      </div>

      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "0.5rem",
            fontFamily: "var(--font-family)",
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          <span>Almost Done</span>
          <span style={{ opacity: 0.5 }}>90%</span>
        </div>
        <Progress value={90} showLabel />
      </div>

      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "0.5rem",
            fontFamily: "var(--font-family)",
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--color-emerald, #10b981)",
          }}
        >
          <span>Complete!</span>
          <span>100%</span>
        </div>
        <Progress value={100} showLabel />
      </div>
    </div>
  ),
};

export const MultipleProgress: Story = {
  render: () => {
    const [scanning, setScanning] = useState(0);
    const [indexing, setIndexing] = useState(0);
    const [building, setBuilding] = useState(0);

    useEffect(() => {
      // Scanning phase
      const scanInterval = setInterval(() => {
        setScanning((prev) => {
          if (prev >= 100) {
            clearInterval(scanInterval);
            // Start indexing
            const indexInterval = setInterval(() => {
              setIndexing((p) => {
                if (p >= 100) {
                  clearInterval(indexInterval);
                  // Start building
                  const buildInterval = setInterval(() => {
                    setBuilding((b) => {
                      if (b >= 100) {
                        clearInterval(buildInterval);
                        return 100;
                      }
                      return b + 2;
                    });
                  }, 40);
                  return 100;
                }
                return p + 3;
              });
            }, 30);
            return 100;
          }
          return prev + 5;
        });
      }, 40);

      return () => clearInterval(scanInterval);
    }, []);

    return (
      <div
        style={{
          width: "500px",
          padding: "1.5rem",
          border: "3px solid var(--color-border)",
          borderRadius: "1.6rem 1.6rem 2.3rem 0.4rem",
          background: "var(--color-block)",
          boxShadow: "10px 10px 0 var(--color-ink)",
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-family)",
            fontSize: "1.25rem",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: "1.5rem",
            fontWeight: "bold",
          }}
        >
          Weaver Nest Builder
        </h3>

        <div style={{ display: "grid", gap: "1.25rem" }}>
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.5rem",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-family)",
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                1. Scanning Packs
              </span>
              {scanning === 100 && (
                <span style={{ fontSize: "0.7rem", opacity: 0.5 }}>✓</span>
              )}
            </div>
            <Progress value={scanning} />
          </div>

          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.5rem",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-family)",
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  opacity: scanning < 100 ? 0.4 : 1,
                }}
              >
                2. Indexing Assets
              </span>
              {indexing === 100 && (
                <span style={{ fontSize: "0.7rem", opacity: 0.5 }}>✓</span>
              )}
            </div>
            <Progress value={indexing} />
          </div>

          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.5rem",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-family)",
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  opacity: indexing < 100 ? 0.4 : 1,
                }}
              >
                3. Building Pack
              </span>
              {building === 100 && (
                <span style={{ fontSize: "0.7rem", opacity: 0.5 }}>✓</span>
              )}
            </div>
            <Progress value={building} showLabel />
          </div>
        </div>

        {building === 100 && (
          <p
            style={{
              marginTop: "1.5rem",
              padding: "0.75rem",
              background: "rgb(16 185 129 / 15%)",
              border: "2px solid var(--color-emerald, #10b981)",
              borderRadius: "0.4rem",
              fontFamily: "var(--font-family)",
              fontSize: "0.75rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--color-emerald, #10b981)",
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            Build Complete!
          </p>
        )}
      </div>
    );
  },
};

export const Sizes: Story = {
  render: () => (
    <div style={{ width: "500px", display: "grid", gap: "1.5rem" }}>
      <div>
        <p
          style={{
            marginBottom: "0.5rem",
            fontSize: "0.75rem",
            opacity: 0.7,
          }}
        >
          Small (default height)
        </p>
        <Progress value={45} style={{ height: "0.75rem" }} />
      </div>
      <div>
        <p
          style={{
            marginBottom: "0.5rem",
            fontSize: "0.75rem",
            opacity: 0.7,
          }}
        >
          Medium (default)
        </p>
        <Progress value={65} showLabel />
      </div>
      <div>
        <p
          style={{
            marginBottom: "0.5rem",
            fontSize: "0.75rem",
            opacity: 0.7,
          }}
        >
          Large
        </p>
        <Progress value={85} showLabel style={{ height: "2rem" }} />
      </div>
    </div>
  ),
};
