import s from "../Drawer.module.scss";

export const DrawerFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={[s.footer, className].filter(Boolean).join(" ")} {...props} />
);
DrawerFooter.displayName = "DrawerFooter";
