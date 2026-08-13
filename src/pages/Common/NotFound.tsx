import AppStatusPage from "../../components/common/AppStatusPage";

export default function NotFound() {
  return (
    <AppStatusPage
      type="not-found"
      title="Page Not Found"
      subtitle="We couldn't locate the operational page you're searching for."
      description="The link may be outdated, moved to a different operations hub, or does not exist in the fleet workspace."
      showBackButton={true}
      showHomeButton={true}
    />
  );
}
