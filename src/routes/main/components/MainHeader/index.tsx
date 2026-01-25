import Button from "@/ui/components/buttons/Button";
import s from "../../../main.module.scss";

interface MainHeaderProps {
  onOpenSettings: () => void;
}

export function MainHeader({ onOpenSettings }: MainHeaderProps) {
  return (
    <div className={s.header} data-tauri-drag-region>
      <div className={s.headerContent}>
        <div className={s.headerLeft}>
          <div className={s.headerTitle}>
            <h1>Weaverbird</h1>
            <p>Minecraft Resource Pack Manager</p>
          </div>
        </div>
        <div className={s.headerRight}>
          <Button
            className={s.settingsButton}
            onClick={onOpenSettings}
            aria-label="Open settings"
            variant="ghost"
            size="md"
          >
            ⚙️
          </Button>
        </div>
      </div>
    </div>
  );
}
