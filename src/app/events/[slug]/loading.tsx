import { SiteFooter } from "@/components/site-footer";

import styles from "./event-details.module.css";
import { SiteHeader } from "@/components/site-header";

export default function EventDetailsLoading() {
  return (
    <div className="site-shell">
      <SiteHeader />
      <main id="main-content" className={`${styles.page} wrap`} aria-label="Loading event details">
        <div className={`${styles.skeleton} ${styles.skeletonLink}`} />
        <div className={`${styles.skeleton} ${styles.skeletonHero}`} />
        <div className={`${styles.skeleton} ${styles.skeletonInfo}`} />
        <div className={`${styles.skeleton} ${styles.skeletonTiers}`} />
      </main>
      <SiteFooter />
    </div>
  );
}
