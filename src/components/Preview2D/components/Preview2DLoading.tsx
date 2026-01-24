/**
 * Loading component for Preview2D
 */
import s from "../styles.module.scss";

export function Preview2DLoading() {
  return (
    <div className={s.root}>
      <div className={s.loading}>Loading texture...</div>
    </div>
  );
}
