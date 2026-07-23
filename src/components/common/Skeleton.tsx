// BaseSkeleton()          // ⭐ Sabka base

// CardSkeleton()          // Dashboard Cards

// TableSkeleton()         // CRUD Tables

// FleetSkeleton()         // Fleet Monitoring

// FormSkeleton()          // Add/Edit/View Forms

// ChartSkeleton()         // Charts

// NotificationSkeleton()  // Notifications

import React from "react";

type BaseSkeletonProps = {
  className?: string;
};

export function BaseSkeleton({ className = "" }: BaseSkeletonProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-slate-200 dark:bg-slate-700 ${className}`}
    >
      {/* Premium Shimmer */}
      <div className="absolute inset-y-0 -left-1/2 w-1/2 animate-shimmer bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/20" />
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <BaseSkeleton className="h-5 w-32 mb-4" />
      <BaseSkeleton className="h-10 w-20 mb-4" />
      <BaseSkeleton className="h-3 w-full" />
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
      <div className="p-4 space-y-4">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="grid grid-cols-5 gap-4">
            <BaseSkeleton className="h-5 w-full" />
            <BaseSkeleton className="h-5 w-full" />
            <BaseSkeleton className="h-5 w-full" />
            <BaseSkeleton className="h-5 w-full" />
            <BaseSkeleton className="h-5 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function FleetSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
        >
          <BaseSkeleton className="h-6 w-40 mb-5" />

          <div className="grid grid-cols-2 gap-4">
            <BaseSkeleton className="h-24 w-full rounded-xl" />
            <BaseSkeleton className="h-24 w-full rounded-xl" />
            <BaseSkeleton className="h-24 w-full rounded-xl" />
            <BaseSkeleton className="h-24 w-full rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="space-y-5">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index}>
          <BaseSkeleton className="mb-2 h-4 w-28" />
          <BaseSkeleton className="h-11 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <BaseSkeleton className="mb-6 h-6 w-40" />
      <BaseSkeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}

export function NotificationSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
        >
          <BaseSkeleton className="h-12 w-12 rounded-full" />

          <div className="flex-1 space-y-2">
            <BaseSkeleton className="h-4 w-48" />
            <BaseSkeleton className="h-3 w-72" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-8 p-6">
      {/* Top Stats */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>

      {/* Fleet */}
      <FleetSkeleton />

      {/* Table */}
      <TableSkeleton rows={6} />
    </div>
  );
}

export default function Skeleton() {
  return <></>;
}
