import { ReactNode } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/ui/components/Drawer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/ui/components/tabs";
import Button from "@/ui/components/buttons/Button";
import s from "./styles.module.scss";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  minecraftTab: ReactNode;
  outputTab: ReactNode;
}

export default function Settings({
  isOpen,
  onClose,
  minecraftTab,
  outputTab,
}: Props) {
  return (
    <Drawer open={isOpen} onOpenChange={onClose} position="center">
      <DrawerContent className={s.drawerContent}>
        <DrawerHeader className={s.drawerHeader}>
          <DrawerTitle>Settings</DrawerTitle>
          <DrawerClose asChild>
            <Button
              variant="ghost"
              size="md"
              aria-label="Close settings"
              className={s.closeButton}
            >
              ✕
            </Button>
          </DrawerClose>
        </DrawerHeader>

        <div className={s.content}>
          <Tabs defaultValue="minecraft">
            <TabsList>
              <TabsTrigger value="minecraft">Minecraft Locations</TabsTrigger>
              <TabsTrigger value="output">Output Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="minecraft">{minecraftTab}</TabsContent>
            <TabsContent value="output">{outputTab}</TabsContent>
          </Tabs>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
