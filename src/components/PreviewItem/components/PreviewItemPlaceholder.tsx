import s from "../styles.module.scss";

export function PreviewItemPlaceholder() {
  return (
    <div className={s.root}>
      <div className={s.placeholder}>Select an item to preview</div>
    </div>
  );
}
