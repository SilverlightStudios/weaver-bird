import { TabsContent } from "@/ui/components/tabs";
import { Separator } from "@/ui/components/Separator/Separator";
import { useEffect } from "react";
import { useStore } from "@state/store";

interface SignOptionsTabProps {
  isHangingSign?: boolean;
}

export const SignOptionsTab = ({
  isHangingSign = false,
}: SignOptionsTabProps) => {
  // Get sign text from global state
  const signText = useStore((state) => state.signText ?? ["", "", "", ""]);
  const setSignText = useStore((state) => state.setSignText);

  // Destructure lines for easier access
  const [line1, line2, line3, line4] = signText;

  // Character width-based limit approximation
  // Regular signs: ~15 characters for narrow chars, ~10 for wide chars
  // Hanging signs: narrower, so we use slightly less
  const MAX_CHARS_REGULAR = 15;
  const MAX_CHARS_HANGING = 12;
  const maxChars = isHangingSign ? MAX_CHARS_HANGING : MAX_CHARS_REGULAR;

  // Reset sign text when component unmounts (switching assets)
  useEffect(() => {
    return () => {
      setSignText(["", "", "", ""]);
    };
  }, [setSignText]);

  const handleLineChange =
    (lineIndex: number, maxLength: number) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const {value} = e.target;
      // Limit based on character count (approximation of width-based limit)
      if (value.length <= maxLength) {
        const newText = [...signText];
        newText[lineIndex] = value;
        setSignText(newText);
      }
    };

  return (
    <TabsContent value="sign">
      <div>
        <h3>{isHangingSign ? "Hanging Sign" : "Sign"} Options</h3>
        <Separator style={{ margin: "0.75rem 0" }} />

        <div style={{ marginBottom: "1rem" }}>
          <p
            style={{ fontSize: "0.85rem", color: "#666", marginBottom: "1rem" }}
          >
            Enter text to display on the sign (up to 4 lines).
            {isHangingSign && (
              <span
                style={{
                  display: "block",
                  marginTop: "0.25rem",
                  color: "#888",
                }}
              >
                Hanging signs have narrower lines than regular signs.
              </span>
            )}
          </p>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
          >
            <div>
              <label
                htmlFor="sign-line-1"
                style={{
                  fontSize: "0.75rem",
                  color: "#888",
                  display: "block",
                  marginBottom: "0.25rem",
                }}
              >
                Line 1 ({line1.length}/{maxChars})
              </label>
              <input
                id="sign-line-1"
                type="text"
                value={line1}
                onChange={handleLineChange(0, maxChars)}
                placeholder="First line"
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "0.85rem",
                  fontFamily: "monospace",
                }}
              />
            </div>

            <div>
              <label
                htmlFor="sign-line-2"
                style={{
                  fontSize: "0.75rem",
                  color: "#888",
                  display: "block",
                  marginBottom: "0.25rem",
                }}
              >
                Line 2 ({line2.length}/{maxChars})
              </label>
              <input
                id="sign-line-2"
                type="text"
                value={line2}
                onChange={handleLineChange(1, maxChars)}
                placeholder="Second line"
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "0.85rem",
                  fontFamily: "monospace",
                }}
              />
            </div>

            <div>
              <label
                htmlFor="sign-line-3"
                style={{
                  fontSize: "0.75rem",
                  color: "#888",
                  display: "block",
                  marginBottom: "0.25rem",
                }}
              >
                Line 3 ({line3.length}/{maxChars})
              </label>
              <input
                id="sign-line-3"
                type="text"
                value={line3}
                onChange={handleLineChange(2, maxChars)}
                placeholder="Third line"
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "0.85rem",
                  fontFamily: "monospace",
                }}
              />
            </div>

            <div>
              <label
                htmlFor="sign-line-4"
                style={{
                  fontSize: "0.75rem",
                  color: "#888",
                  display: "block",
                  marginBottom: "0.25rem",
                }}
              >
                Line 4 ({line4.length}/{maxChars})
              </label>
              <input
                id="sign-line-4"
                type="text"
                value={line4}
                onChange={handleLineChange(3, maxChars)}
                placeholder="Fourth line"
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "0.85rem",
                  fontFamily: "monospace",
                }}
              />
            </div>
          </div>
        </div>

        <Separator style={{ margin: "1rem 0" }} />

        <p style={{ fontSize: "0.75rem", color: "#888", fontStyle: "italic" }}>
          Note: Character limits are approximate based on Minecraft's
          width-based system. Wide characters (W, M) take more space than narrow
          ones (I, l).
        </p>
      </div>
    </TabsContent>
  );
};
