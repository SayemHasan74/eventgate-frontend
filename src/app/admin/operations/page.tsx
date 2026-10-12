import { MaintenancePanel } from "./maintenance-panel";
import { RecoveryJobs } from "./recovery-jobs";
import { Suspense } from "react";
export default function OperationsPage() {
  return (
    <>
      <MaintenancePanel />
      <Suspense fallback={<p>Loading recovery jobs…</p>}>
        <RecoveryJobs />
      </Suspense>
    </>
  );
}
