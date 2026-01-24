import { SaveBar } from "@components/SaveBar";
import { VanillaTextureProgress } from "@components/VanillaTextureProgress";
import type { OverrideWirePayload } from "@state";
import s from "../../../main.module.scss";

interface MainFooterProps {
  vanillaProgress: { current: number; total: number } | null;
  vanillaProgressVisible: boolean;
  progress?: {
    phase: string;
    completed: number;
    total: number;
    bytes?: number;
  };
  outputDir?: string;
  packsDir: string;
  packOrder: string[];
  overrides: Record<string, OverrideWirePayload>;
  errorMessage: string | undefined;
  successMessage: string | undefined;
  onClearStatus: () => void;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function MainFooter({
  vanillaProgress,
  vanillaProgressVisible,
  progress,
  outputDir,
  packsDir,
  packOrder,
  overrides,
  errorMessage,
  successMessage,
  onClearStatus,
  onSuccess,
  onError,
}: MainFooterProps) {
  return (
    <div className={s.footer}>
      <VanillaTextureProgress
        progress={vanillaProgress}
        isVisible={vanillaProgressVisible}
      />
      <SaveBar
        isLoading={false}
        progress={progress}
        disabled={!outputDir || !packsDir}
        packsDir={packsDir}
        packOrder={packOrder}
        overrides={overrides}
        outputDir={outputDir}
        statusMessage={errorMessage ?? successMessage}
        statusType={
          errorMessage ? "error" : successMessage ? "success" : "idle"
        }
        onClearStatus={onClearStatus}
        onSuccess={onSuccess}
        onError={onError}
      />
    </div>
  );
}
