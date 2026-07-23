

interface CompanyPlanCardProps {
  subscription: any;
  machineCount: number;
}

export default function CompanyPlanCard({
  subscription,
  machineCount,
}: CompanyPlanCardProps) {
  if (!subscription) {
    return (<></>);
  }

  const calculateDaysLeft = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();

    return Math.max(
      0,
      Math.ceil(diff / (1000 * 60 * 60 * 24))
    );
  };

  const daysLeft = calculateDaysLeft(
    subscription.subscription_end_date ||
      subscription.subscriptionEndDate ||
      subscription.end_date
  );

  const isDemo =
    (subscription.plan_name || subscription.name)
      ?.toLowerCase() === "demo";

  const usagePercentage = subscription.machine_limit
    ? Math.min(
        100,
        Math.round(
          (machineCount / subscription.machine_limit) * 100
        )
      )
    : 0;

  return (<>
  </>

  );
}