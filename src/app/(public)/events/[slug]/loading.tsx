import styles from "./event-details.module.css";

export default function EventDetailsLoading() {
  return (
    <>
      <main
        id="main-content"
        className={`${styles.page} wrap`}
        aria-label="Loading event details"
      >
        <div className={`${styles.skeleton} ${styles.skeletonLink}`} />
        <div className={`${styles.skeleton} ${styles.skeletonHero}`} />
        <div className={`${styles.skeleton} ${styles.skeletonInfo}`} />
        <div className={`${styles.skeleton} ${styles.skeletonTiers}`} />
      </main>
    </>
  );
}
