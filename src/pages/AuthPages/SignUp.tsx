import PageMeta from "../../components/common/PageMeta";
import SignUpForm from "../../components/auth/SignUpForm";

export default function SignUp() {
  return (
    <>
      <PageMeta
        title="Sign Up | Mining App"
        description="Create your mining company account"
      />

      <div className="min-h-screen bg-white dark:bg-gray-900">
        <SignUpForm />
      </div>
    </>
  );
}