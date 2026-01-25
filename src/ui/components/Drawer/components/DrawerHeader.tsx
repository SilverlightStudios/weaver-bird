import s from "../Drawer.module.scss";

export const DrawerHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={[s.header, className].filter(Boolean).join(" ")} {...props} />
);
DrawerHeader.displayName = "DrawerHeader";
