import AppStatusPage from "../../components/common/AppStatusPage";

export default function ComingSoon() {
  return (
    <AppStatusPage
      type="coming-soon"
      title="Feature Coming Soon"
      subtitle="This operational module is currently being finalized."
      description="Advanced analytics, fleet automation, and specialized equipment reporting toolsets will be available in the upcoming release."
      showBackButton={true}
      showHomeButton={true}
    />
  );
}
