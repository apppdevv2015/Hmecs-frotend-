import PageMeta from "../../components/common/PageMeta";

export default function Documents() {
  return (
    <>
      <PageMeta
        title="Documents | Company Admin"
        description="Company Admin documents"
      />

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Documents
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            View quotation and company-related documents.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            No Documents
          </h2>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Available documents will appear here.
          </p>
        </div>
      </div>
    </>
  );
}