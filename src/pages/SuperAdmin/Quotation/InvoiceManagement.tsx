const InvoiceManagement = () => {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900">
          Invoice Management
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Manage invoices, payments and invoice history.
        </p>
      </div>

      <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50">
        <p className="text-sm font-medium text-slate-500">
          Invoice management content will be added here.
        </p>
      </div>
    </section>
  );
};

export default InvoiceManagement;