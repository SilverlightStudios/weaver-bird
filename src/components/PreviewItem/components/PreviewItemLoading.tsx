import s from "../styles.module.scss";

export function PreviewItemLoading() {
  return (
    <div className={s.root}>
      <div className={s.loading}>Loading item...</div>
    </div>
  );
}
