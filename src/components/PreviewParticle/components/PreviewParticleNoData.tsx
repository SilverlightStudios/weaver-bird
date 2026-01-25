import s from "../styles.module.scss";

export function PreviewParticleNoData() {
  return (
    <div className={s.noData}>
      <span>Particle physics not extracted</span>
    </div>
  );
}
