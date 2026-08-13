import AppStatusPage from "../../components/common/AppStatusPage";

export default function AccessDenied() {
  return (
    <AppStatusPage
      type="access-denied"
      title="Access Restricted"
      subtitle="Your account does not have sufficient role clearance for this module."
      description="Please verify your department role or return to your authorized dashboard workspace."
      showBackButton={true}
      showHomeButton={true}
    />
  );
}
