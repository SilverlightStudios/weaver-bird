import s from "../styles.module.scss";

export function PreviewItemError() {
  return (
    <div className={s.root}>
      <div className={s.error}>Failed to load item texture</div>
    </div>
  );
}
