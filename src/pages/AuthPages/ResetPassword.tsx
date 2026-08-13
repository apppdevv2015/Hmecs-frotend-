import PageMeta from "../../components/common/PageMeta";
import ResetPasswordForm from "../../components/auth/ResetPasswordForm";

export default function ResetPassword() {
  return (
    <>
      <PageMeta
        title="Reset Password | HME Component Intelligence System"
        description="Reset your HME account password securely."
      />
      <ResetPasswordForm />
    </>
  );
}
