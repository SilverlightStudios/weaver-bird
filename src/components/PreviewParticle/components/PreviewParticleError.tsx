import s from "../styles.module.scss";

export function PreviewParticleError() {
  return (
    <div className={s.root}>
      <div className={s.error}>Invalid particle asset ID</div>
    </div>
  );
}
