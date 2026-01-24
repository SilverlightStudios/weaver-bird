/**
 * Error component for Preview2D
 */
import s from "../styles.module.scss";

export function Preview2DError() {
  return (
    <div className={s.root}>
      <div className={s.error}>Failed to load texture</div>
    </div>
  );
}
