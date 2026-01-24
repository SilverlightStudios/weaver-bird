import { useCallback, useMemo } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { Combobox, type ComboboxOption } from "@/ui/components/Combobox/Combobox";
import { Separator } from "@/ui/components/Separator/Separator";
import type { LauncherSelectorProps } from "./types";
import s from "../../styles.module.scss";

export const LauncherSelector = ({
    selectedLauncher,
    availableLaunchers,
    onLauncherChange,
}: LauncherSelectorProps) => {
    const handleLauncherSelect = useCallback(
        (value: string) => {
            const launcher = availableLaunchers.find(
                (l) => l.minecraft_dir === value,
            );
            if (launcher) {
                onLauncherChange(launcher);
            }
        },
        [availableLaunchers, onLauncherChange],
    );

    const launcherOptions = useMemo<ComboboxOption[]>(
        () =>
            availableLaunchers.map((launcher) => ({
                value: launcher.minecraft_dir,
                label: launcher.name,
                disabled: !launcher.found,
            })),
        [availableLaunchers],
    );

    if (availableLaunchers.length === 0) {
        return null;
    }

    return (
        <>
            <div className={s.launcherSection}>
                <label htmlFor="launcher-select" className={s.launcherLabel}>
                    Minecraft Location
                </label>
                <Combobox
                    options={launcherOptions}
                    value={selectedLauncher?.minecraft_dir ?? ""}
                    onValueChange={handleLauncherSelect}
                    placeholder="Select launcher..."
                    searchPlaceholder="Search launchers..."
                    emptyMessage="No launchers found"
                    renderTrigger={({ selectedLabel, placeholder, isOpen }) => (
                        <div className={s.launcherDropdownWrapper}>
                            {selectedLauncher?.icon_path && (
                                <img
                                    src={convertFileSrc(selectedLauncher.icon_path)}
                                    alt={`${selectedLauncher.name} icon`}
                                    className={s.launcherDropdownIcon}
                                />
                            )}
                            <button
                                className={s.launcherDropdown}
                                type="button"
                                aria-expanded={isOpen}
                            >
                                <span className={s.launcherDropdownText}>
                                    {selectedLabel ?? placeholder}
                                </span>
                                <span className={s.launcherDropdownArrow}>
                                    {isOpen ? "▲" : "▼"}
                                </span>
                            </button>
                        </div>
                    )}
                />
            </div>
            <Separator className={s.separator} />
        </>
    );
};
