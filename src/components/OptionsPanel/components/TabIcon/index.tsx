import {
    Tooltip,
    TooltipTrigger,
    TooltipContent,
} from "@/ui/components/Tooltip";
import { TabsTrigger } from "@/ui/components/tabs";
import type { TabIconProps } from "../../types";
import s from "../../styles.module.scss";

export const TabIcon = ({ icon, label, value }: TabIconProps) => {
    return (
        <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
                <TabsTrigger value={value} aria-label={label}>
                    <span className={s.tabIcon}>{icon}</span>
                </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={8}>
                {label}
            </TooltipContent>
        </Tooltip>
    );
};
