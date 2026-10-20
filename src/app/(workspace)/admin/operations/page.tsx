import { MaintenancePanel } from "./maintenance-panel";
import { RecoveryJobs } from "./recovery-jobs";
import { EmailIncidents } from "./email-incidents";
import { Suspense } from "react";
export default function OperationsPage() {
  return (
    <>
      <MaintenancePanel />
      <EmailIncidents />
      <Suspense fallback={<p>Loading recovery jobs…</p>}>
        <RecoveryJobs />
      </Suspense>
    </>
  );
}
