export type PricingPlan = {
  name: string;
  price: string;
  period: string;
  subtitle: string;
  limit: string;
  icon: string;
  features: string[];
  popular: boolean;
};

export const pricingPlans: PricingPlan[] = [
  {
    name: "Basic",
    price: "$59",
    period: "/month",
    subtitle: "For small mining teams",
    limit: "Up to 10 machines",
    icon: "⚙️",
    features: [
      "Company admin account",
      "Up to 10 machine records",
      "Basic maintenance task tracking",
      "Alert overview dashboard",
      "Email support",
    ],
    popular: false,
  },
  {
    name: "Pro",
    price: "$149",
    period: "/month",
    subtitle: "For growing mining operations",
    limit: "Up to 50 machines",
    icon: "🚜",
    features: [
      "Everything in Basic",
      "Artisans and planner roles",
      "Advanced maintenance planning",
      "Tyre, engine and hydraulic modules",
      "Priority support",
    ],
    popular: true,
  },
  {
    name: "Plus",
    price: "$299",
    period: "/month",
    subtitle: "For large mining companies",
    limit: "Unlimited machines",
    icon: "🏭",
    features: [
      "Everything in Pro",
      "Multi-site company structure",
      "OEM / supplier limited access",
      "Group-level reporting",
      "Dedicated support",
    ],
    popular: false,
  },
];
