"use client";

import React, { useState, useEffect } from "react";
import {
  ListChecks,
  Plus,
  Search,
  Truck,
  Check,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Pencil,
  Trash2,
  X,
  Tag,
  Building2,
  AlertCircle,
  AlertTriangle,
  
  RefreshCw,
} from "lucide-react";
import { showSuccessToast, showErrorToast } from "../../utils/toastUtils";
import {
  EQUIPMENT_ICON_CATALOG,
  getEquipmentIconComponent,
  searchEquipmentIcons,
} from "../../config/equipmentIcons.config";
import { getApiBaseUrl } from "../../services/api";
import StorageService from "../../services/storage.service";
import Pagination from "../../components/common/Pagination";
import StorageService from "../../services/storage.service";
import { isReadOnlyRole } from "../../components/common/permissions";

const API_BASE = getApiBaseUrl().replace(/\/$/, "");

// Validation Constants
const NAME_MIN_LENGTH = 3;
const NAME_MAX_LENGTH = 50;
const DESC_MAX_LENGTH = 250;

type EquipmentTypeItem = {
  id: string;
  name: string;
  description: string;
  icon: string;
  isActive: boolean;
  companyName: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
};

export default function CategoryManagement() {

  const [activeTab, setActiveTab] = useState<"equipment" | "component">(
    "equipment",
  );
  const readOnly = isReadOnlyRole(StorageService.getRole());


  const [search, setSearch] = useState("");
  const [iconSearch, setIconSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Equipment Types State
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentTypeItem[]>([]);

  const [componentCategories, setComponentCategories] = useState<
    ComponentCategoryItem[]
  >([]);


  // Modal State for Create & Edit
  const [isEqModalOpen, setIsEqModalOpen] = useState(false);
  const [editingEqItem, setEditingEqItem] = useState<EquipmentTypeItem | null>(
    null,
  );


  const [isCcModalOpen, setIsCcModalOpen] = useState(false);
  const [editingCcItem, setEditingCcItem] =
    useState<ComponentCategoryItem | null>(null);

  // Validation Error States
  const [eqErrors, setEqErrors] = useState<{
    name?: string;
    description?: string;
  }>({});
  const [ccErrors, setCcErrors] = useState<{
    name?: string;
    description?: string;
  }>({});

  // Validation Error State
  const [eqErrors, setEqErrors] = useState<{ name?: string; description?: string }>({});


  // Delete Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form Inputs

  const [eqForm, setEqForm] = useState({
    name: "",
    description: "",
    icon: "Truck",
  });
  const [ccForm, setCcForm] = useState({ name: "", description: "" });

  const [eqForm, setEqForm] = useState({ name: "", description: "", icon: "Truck" });


  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number | "all">(5);

  // Reset pagination on search change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, pageSize]);

  const getHeaders = () => {
    let token =
      localStorage.getItem("accessToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      sessionStorage.getItem("token") ||
      "";

    if (token) {
      token = token.trim();
      if (
        (token.startsWith('"') && token.endsWith('"')) ||
        (token.startsWith("'") && token.endsWith("'"))
      ) {
        try {
          const parsed = JSON.parse(token);
          if (typeof parsed === "string") token = parsed;
        } catch (e) {
          token = token.slice(1, -1);
        }
      }
    }

    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  };

  // --- 1. GET API: Fetch Real Records from DB (Custom Categories + Active Company Fleet Machine Categories) ---
  const fetchRealDbData = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const headers = getHeaders();
      const user = StorageService.getUser();
      const companyId = user?.companyId || user?.company_id || StorageService.getCompanyId() || "";
      const query = companyId ? `?companyId=${encodeURIComponent(companyId)}` : "";


      // Fetch Machine Equipment Types
      const eqRes = await fetch(
        `${API_BASE}/machines/categories?includeInactive=true`,
        { headers },
      );
      if (eqRes.ok) {
        const eqData = await eqRes.json();
        if (eqData && Array.isArray(eqData.data)) {
          setEquipmentTypes(
            eqData.data.map((item: any) => ({
              id: item.id,
              name: item.name,
              description: item.description || "",
              icon: item.icon || "Truck",
              isActive: item.isActive !== undefined ? item.isActive : true,
              companyName: item.companyName || "Mining Operations Ltd",
              companyId: item.companyId || "COMP-101",
              createdAt: item.createdAt
                ? item.createdAt.split("T")[0]
                : new Date().toISOString().split("T")[0],
              updatedAt: item.updatedAt
                ? item.updatedAt.split("T")[0]
                : item.createdAt
                  ? item.createdAt.split("T")[0]
                  : new Date().toISOString().split("T")[0],
            })),
          );
        }
      }

      // Fetch Component Categories
      const compRes = await fetch(
        `${API_BASE}/components/categories?includeInactive=true`,
        { headers },
      );
      if (compRes.ok) {
        const compData = await compRes.json();
        if (compData && Array.isArray(compData.data)) {
          setComponentCategories(
            compData.data.map((item: any) => ({
              id: item.id,
              name: item.name,
              description: item.description || "",
              isActive: item.isActive !== undefined ? item.isActive : true,
              companyName: item.companyName || "Mining Operations Ltd",
              companyId: item.companyId || "COMP-101",
              createdAt: item.createdAt
                ? item.createdAt.split("T")[0]
                : new Date().toISOString().split("T")[0],
              updatedAt: item.updatedAt
                ? item.updatedAt.split("T")[0]
                : item.createdAt
                  ? item.createdAt.split("T")[0]
                  : new Date().toISOString().split("T")[0],
            })),
          );
        }

      const res = await fetch(`${API_BASE}/machines/categories${query}`, { headers });
      const resJson = await res.json();

      if (resJson && Array.isArray(resJson.data)) {
        setEquipmentTypes(
          resJson.data.map((item: any) => ({
            id: item.id,
            name: item.name,
            description: item.description || "Company Equipment Type",
            icon: item.icon || "Truck",
            isActive: item.isActive !== undefined ? item.isActive : true,
            companyName: item.companyName || user?.companyName || "Mining Operations Ltd",
            companyId: item.companyId || companyId || "COMP-101",
            createdAt: item.createdAt ? item.createdAt.split("T")[0] : new Date().toISOString().split("T")[0],
            updatedAt: item.updatedAt ? item.updatedAt.split("T")[0] : new Date().toISOString().split("T")[0],
          }))
        );

      }
    } catch (err: any) {
      console.error("Error fetching categories:", err);
      setApiError("Failed to load categories from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealDbData();
  }, []);

  // --- Validation Helpers ---
  const validateEqForm = (nameVal: string, descVal: string): boolean => {
    const errors: { name?: string; description?: string } = {};
    const trimmed = nameVal.trim();

    if (!trimmed) {
      errors.name = "Equipment Type Name is required.";
    } else if (trimmed.length < NAME_MIN_LENGTH) {
      errors.name = `Name must be at least ${NAME_MIN_LENGTH} characters long.`;
    } else if (trimmed.length > NAME_MAX_LENGTH) {
      errors.name = `Name cannot exceed ${NAME_MAX_LENGTH} characters.`;
    } else {
      const isDuplicate = equipmentTypes.some(
        (item) =>
          item.name.toLowerCase() === trimmed.toLowerCase() &&
          item.id !== editingEqItem?.id,
      );
      if (isDuplicate) {
        errors.name = "An equipment type with this name already exists.";
      }
    }

    if (descVal.length > DESC_MAX_LENGTH) {
      errors.description = `Description cannot exceed ${DESC_MAX_LENGTH} characters.`;
    }

    setEqErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateCcForm = (nameVal: string, descVal: string): boolean => {
    const errors: { name?: string; description?: string } = {};
    const trimmed = nameVal.trim();

    if (!trimmed) {
      errors.name = "Component Category Name is required.";
    } else if (trimmed.length < NAME_MIN_LENGTH) {
      errors.name = `Name must be at least ${NAME_MIN_LENGTH} characters long.`;
    } else if (trimmed.length > NAME_MAX_LENGTH) {
      errors.name = `Name cannot exceed ${NAME_MAX_LENGTH} characters.`;
    } else {
      const isDuplicate = componentCategories.some(
        (item) =>
          item.name.toLowerCase() === trimmed.toLowerCase() &&
          item.id !== editingCcItem?.id,
      );
      if (isDuplicate) {
        errors.name = "A component category with this name already exists.";
      }
    }

    if (descVal.length > DESC_MAX_LENGTH) {
      errors.description = `Description cannot exceed ${DESC_MAX_LENGTH} characters.`;
    }

    setCcErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Field change handlers with live validation
  const handleEqNameChange = (val: string) => {
    setEqForm((prev) => ({ ...prev, name: val }));
    validateEqForm(val, eqForm.description);
  };

  const handleEqDescChange = (val: string) => {
    setEqForm((prev) => ({ ...prev, description: val }));
    validateEqForm(eqForm.name, val);
  };

  const handleCcNameChange = (val: string) => {
    setCcForm((prev) => ({ ...prev, name: val }));
    validateCcForm(val, ccForm.description);
  };

  const handleCcDescChange = (val: string) => {
    setCcForm((prev) => ({ ...prev, description: val }));
    validateCcForm(ccForm.name, val);
  };

  // --- 2. POST & PUT API: Save Equipment Type ---
  const handleSaveEquipmentType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEqForm(eqForm.name, eqForm.description)) {
      return;
    }

    setApiError(null);
    try {
      const headers = getHeaders();
      const isEditing = Boolean(editingEqItem);
      const url = isEditing
        ? `${API_BASE}/machines/categories/${editingEqItem!.id}`
        : `${API_BASE}/machines/categories`;

      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify({
          name: eqForm.name.trim(),
          description: eqForm.description.trim(),
          icon: eqForm.icon,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson.message || "Failed to save equipment type.");
      }

      showSuccessToast(
        isEditing
          ? "Equipment type updated successfully!"
          : "Equipment type created successfully!",
      );

      // Refresh list from backend
      await fetchRealDbData();
      setEqForm({ name: "", description: "", icon: "Truck" });
      setEqErrors({});
      setEditingEqItem(null);
      setIsEqModalOpen(false);
    } catch (err: any) {
      console.error("Equipment type save error:", err);
      showErrorToast(err.message || "Something went wrong.");
      setApiError(err.message || "Something went wrong.");
    }
  };

  // --- 3. POST & PUT API: Save Component Category ---
  const handleSaveComponentCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCcForm(ccForm.name, ccForm.description)) {
      return;
    }

    setApiError(null);
    try {
      const headers = getHeaders();
      const isEditing = Boolean(editingCcItem);
      const url = isEditing
        ? `${API_BASE}/components/categories/${editingCcItem!.id}`
        : `${API_BASE}/components/categories`;

      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify({
          name: ccForm.name.trim(),
          description: ccForm.description.trim(),
        }),
      });

      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(
          resJson.message || "Failed to save component category.",
        );
      }

      showSuccessToast(
        isEditing
          ? "Component category updated successfully!"
          : "Component category created successfully!",
      );

      // Refresh list from backend
      await fetchRealDbData();
      setCcForm({ name: "", description: "" });
      setCcErrors({});
      setEditingCcItem(null);
      setIsCcModalOpen(false);
    } catch (err: any) {
      console.error("Component category save error:", err);
      showErrorToast(err.message || "Something went wrong.");
      setApiError(err.message || "Something went wrong.");
    }
  };

  // --- 4. PUT API: Toggle Status ---
  const toggleEqStatus = async (item: EquipmentTypeItem) => {
    try {
      const headers = getHeaders();
      const newStatus = !item.isActive;
      const res = await fetch(`${API_BASE}/machines/categories/${item.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ isActive: newStatus }),
      });
      if (res.ok) {
        setEquipmentTypes((prev) =>
          prev.map((eq) =>
            eq.id === item.id ? { ...eq, isActive: newStatus } : eq,
          ),
        );
        showSuccessToast(
          `'${item.name}' status set to ${newStatus ? "Active" : "Deactive"}`,
        );
      } else {
        const resJson = await res.json();
        showErrorToast(resJson.message || "Failed to update status.");
      }
    } catch (err) {
      console.error("Toggle equipment status error:", err);
      showErrorToast("Error updating status.");
    }
  };

  const toggleCcStatus = async (item: ComponentCategoryItem) => {
    try {
      const headers = getHeaders();
      const newStatus = !item.isActive;
      const res = await fetch(`${API_BASE}/components/categories/${item.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ isActive: newStatus }),
      });
      if (res.ok) {
        setComponentCategories((prev) =>
          prev.map((cc) =>
            cc.id === item.id ? { ...cc, isActive: newStatus } : cc,
          ),
        );
        showSuccessToast(
          `'${item.name}' status set to ${newStatus ? "Active" : "Deactive"}`,
        );
      } else {
        const resJson = await res.json();
        showErrorToast(resJson.message || "Failed to update status.");
      }
    } catch (err) {
      console.error("Toggle component status error:", err);
      showErrorToast("Error updating status.");
    }
  };

  // --- 5. DELETE API: Delete Category ---
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const headers = getHeaders();
      const url = `${API_BASE}/machines/categories/${deleteTarget.id}`;

      const res = await fetch(url, { method: "DELETE", headers });
      const resJson = await res.json();

      if (res.ok) {

        if (deleteTarget.type === "equipment") {
          setEquipmentTypes((prev) =>
            prev.filter((item) => item.id !== deleteTarget.id),
          );
        } else {
          setComponentCategories((prev) =>
            prev.filter((item) => item.id !== deleteTarget.id),
          );
        }

        setEquipmentTypes((prev) => prev.filter((item) => item.id !== deleteTarget.id));

        showSuccessToast(`'${deleteTarget.name}' deleted successfully!`);
        setDeleteTarget(null);
      } else {
        showErrorToast(resJson.message || "Failed to delete category.");
      }
    } catch (err) {
      console.error("Delete category error:", err);
      showErrorToast("Error deleting category from server.");
    } finally {
      setDeleting(false);
    }
  };

  // Open Edit Modal
  const openEditEqModal = (item: EquipmentTypeItem) => {
    setEditingEqItem(item);
    setEqForm({
      name: item.name,
      description: item.description,
      icon: item.icon,
    });
    setEqErrors({});
    setIconSearch("");
    setIsEqModalOpen(true);
  };

  // Open Create Modal
  const openCreateEqModal = () => {
    setEditingEqItem(null);
    setEqForm({ name: "", description: "", icon: "Truck" });
    setEqErrors({});
    setIconSearch("");
    setIsEqModalOpen(true);
  };

  // Dynamic Render Icon Helper
  const renderIcon = (iconName: string) => {
    const IconComponent = getEquipmentIconComponent(iconName);
    return (
      <IconComponent className="h-5 w-5 text-blue-600 dark:text-blue-400" />
    );
  };

  // Filtered Icon Picker List
  const filteredIcons = searchEquipmentIcons(iconSearch);

  // Filtered Lists
  const filteredEq = equipmentTypes.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()),
  );


  const filteredCc = componentCategories.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()),
  );

  // Pagination Logic
  const currentTotal =
    activeTab === "equipment" ? filteredEq.length : filteredCc.length;

  // Pagination Logic
  const currentTotal = filteredEq.length;

  const isShowAll = pageSize === "all";
  const numericPageSize = isShowAll ? currentTotal || 1 : pageSize;
  const totalPages = isShowAll
    ? 1
    : Math.max(1, Math.ceil(currentTotal / numericPageSize));

  const startIndex = isShowAll ? 0 : (currentPage - 1) * numericPageSize;
  const endIndex = isShowAll
    ? currentTotal
    : Math.min(startIndex + numericPageSize, currentTotal);


  const paginatedEq = isShowAll
    ? filteredEq
    : filteredEq.slice(startIndex, endIndex);
  const paginatedCc = isShowAll
    ? filteredCc
    : filteredCc.slice(startIndex, endIndex);

  const paginatedEq = isShowAll ? filteredEq : filteredEq.slice(startIndex, endIndex);


  return (
    <div className="min-h-screen bg-slate-100 p-4 font-sans text-slate-900 dark:bg-[#07111f] dark:text-white sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        {/* Global Error Banner */}
        {apiError && (
          <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 shadow-sm dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
              <span className="text-sm font-semibold">{apiError}</span>
            </div>
            <button
              onClick={() => setApiError(null)}
              className="rounded-lg p-1 hover:bg-red-100 dark:hover:bg-red-900/50"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Premium Header Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-[#3B37E6] via-[#2563EB] to-[#1D4ED8] p-6 text-white shadow-xl dark:border-slate-800">
          <div className="relative z-10 flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                <Building2 size={14} />
                Company Admin Master Controls
              </div>
              <h1 className="text-3xl font-black tracking-tight">
                Category & Equipment Master
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-blue-100">
                Create and manage custom machine equipment types for your
                company database. Records are isolated under your company ID.
              </p>
            </div>

            {/* Header Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={openCreateEqModal}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-blue-700 shadow-lg transition-all hover:bg-blue-50 hover:shadow-xl active:scale-95 dark:bg-slate-900 dark:text-blue-400 dark:hover:bg-slate-800"
              >
                <Plus size={18} className="stroke-[3]" />
                Add Equipment Type
              </button>

              <button
                onClick={fetchRealDbData}
                disabled={loading}
                title="Refresh Data"
                className="inline-flex items-center justify-center rounded-2xl border border-white/30 bg-white/10 p-3 text-white backdrop-blur-md transition-all hover:bg-white/20 active:scale-95 disabled:opacity-50"
              >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>
        </div>

        {/* Header Controls & Search */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
            <button
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all"
            >
              <Truck size={16} />
              Machine Equipment Types ({equipmentTypes.length})
            </button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:w-auto">
            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search equipment types..."
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-semibold text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-[#0b1728] dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Equipment Types Table */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px]">
                <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-[#101f33]">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Equipment Type & Icon
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Description
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Created / Updated Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-8 text-center text-sm font-semibold text-slate-500"
                      >
                        Loading Equipment Types...
                      </td>
                    </tr>
                  )}
                  {!loading && paginatedEq.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-8 text-center text-sm font-semibold text-slate-500"
                      >
                        {filteredEq.length === 0
                          ? "No Equipment Types found. Click 'Create Equipment Type' to add one."
                          : "No items on this page."}
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    paginatedEq.map((item) => (
                      <tr
                        key={item.id}
                        className="transition hover:bg-slate-50 dark:hover:bg-[#101f33]"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40">
                              {renderIcon(item.icon)}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 dark:text-white">
                                {item.name}
                              </h4>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                          {item.description || "N/A"}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-col text-xs font-semibold">
                            <span className="text-slate-800 dark:text-slate-200">
                              Created: {item.createdAt}
                            </span>
                            <span className="text-slate-500">
                              Updated: {item.updatedAt}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <button
                            type="button"
                            onClick={() => !readOnly && toggleEqStatus(item)}
                            disabled={readOnly}
                            title={
                              readOnly
                                ? ""
                                : "Click to toggle Active / Deactive status"
                            }
                            className="group focus:outline-none disabled:cursor-default"
                          >
                            {item.isActive ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-700 shadow-sm transition group-disabled:hover:scale-100 hover:scale-105 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
                                <CheckCircle2 size={13} /> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-3.5 py-1 text-xs font-bold text-slate-600 shadow-sm transition group-disabled:hover:scale-100 hover:scale-105 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                                <XCircle size={13} /> Deactive
                              </span>
                            )}
                          </button>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {!readOnly && (
                              <>
                                <button
                                  onClick={() => openEditEqModal(item)}
                                  className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:border-blue-500 hover:text-blue-600 dark:border-slate-700 dark:text-slate-300"
                                  title="Edit"
                                >
                                  <Pencil size={16} />
                                </button>

                                <button
                                  onClick={() => toggleEqStatus(item)}
                                  className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:border-emerald-500 hover:text-emerald-600 dark:border-slate-700 dark:text-slate-300"
                                  title="Toggle Status"
                                >
                                  <ShieldCheck size={16} />
                                </button>

                                <button
                                  onClick={() =>
                                    setDeleteTarget({
                                      id: item.id,
                                      name: item.name,
                                      type: "equipment",
                                    })
                                  }
                                  className="rounded-xl border border-red-200 p-2 text-red-500 transition hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-950/30"
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                            {readOnly && (
                              <span className="text-xs font-semibold text-slate-400">
                                View Only
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Reusable Global Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              startItem={currentTotal === 0 ? 0 : startIndex + 1}
              endItem={endIndex}
              totalItems={currentTotal}
              itemsPerPage={pageSize}
              itemLabel="equipment types"
              pageSizeOptions={[5, 10, 25, 50]}
              onPrev={() => setCurrentPage((p) => Math.max(1, p - 1))}
              onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              onPageChange={(p) => setCurrentPage(p)}
              onItemsPerPageChange={(val) => setPageSize(val)}
            />
          </div>

        {/* Modal 1: Create / Edit Equipment Type Modal */}
        {isEqModalOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#0b1728]">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {editingEqItem
                    ? "Edit Equipment Type"
                    : "Create Equipment Type"}
                </h3>
                <button
                  onClick={() => setIsEqModalOpen(false)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                >
                  <X size={20} />
                </button>
              </div>

              <form
                onSubmit={handleSaveEquipmentType}
                className="mt-5 space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase text-slate-500">
                      Equipment Type Name *
                    </label>
                    <span
                      className={`text-[11px] font-bold ${eqForm.name.length > NAME_MAX_LENGTH ? "text-red-500" : "text-slate-400"}`}
                    >
                      {eqForm.name.length} / {NAME_MAX_LENGTH}
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    value={eqForm.name}
                    onChange={(e) => handleEqNameChange(e.target.value)}
                    placeholder="e.g. Haul Truck 400T, Hydraulic Excavator"
                    className={`mt-1 h-12 w-full rounded-xl border bg-slate-50 px-4 text-sm font-semibold outline-none transition focus:bg-white dark:bg-[#101f33] dark:text-white ${
                      eqErrors.name
                        ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                        : "border-slate-200 focus:border-blue-500 dark:border-slate-800"
                    }`}
                  />
                  {eqErrors.name && (
                    <p className="mt-1 flex items-center gap-1 text-xs font-bold text-red-500">
                      <AlertCircle size={12} /> {eqErrors.name}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase text-slate-500">
                      Description
                    </label>
                    <span
                      className={`text-[11px] font-bold ${eqForm.description.length > DESC_MAX_LENGTH ? "text-red-500" : "text-slate-400"}`}
                    >
                      {eqForm.description.length} / {DESC_MAX_LENGTH}
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={eqForm.description}
                    onChange={(e) => handleEqDescChange(e.target.value)}
                    placeholder="Enter category description..."
                    className={`mt-1 w-full rounded-xl border bg-slate-50 p-3 text-sm font-semibold outline-none transition focus:bg-white dark:bg-[#101f33] dark:text-white ${
                      eqErrors.description
                        ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                        : "border-slate-200 focus:border-blue-500 dark:border-slate-800"
                    }`}
                  />
                  {eqErrors.description && (
                    <p className="mt-1 flex items-center gap-1 text-xs font-bold text-red-500">
                      <AlertCircle size={12} /> {eqErrors.description}
                    </p>
                  )}
                </div>

                {/* Dynamic Searchable Icon Selector */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase text-slate-500">
                      Select Icon Symbol ({EQUIPMENT_ICON_CATALOG.length}{" "}
                      Machine Icons)
                    </label>
                    <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
                      Selected: {eqForm.icon}
                    </span>
                  </div>

                  {/* Icon Search Bar */}
                  <div className="relative mt-1.5">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={iconSearch}
                      onChange={(e) => setIconSearch(e.target.value)}
                      placeholder="Search icons (e.g. grader, water, drill, loader, dozer, truck, hammer)..."
                      className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-semibold outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-[#101f33] dark:text-white"
                    />
                  </div>

                  {/* Icon Grid */}
                  <div className="mt-2.5 max-h-48 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-[#101f33]">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {filteredIcons.map((item) => {
                        const IconComponent = getEquipmentIconComponent(
                          item.key,
                        );
                        const isSelected = eqForm.icon === item.key;
                        return (
                          <button
                            type="button"
                            key={item.key}
                            onClick={() =>
                              setEqForm({ ...eqForm, icon: item.key })
                            }
                            className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all ${
                              isSelected
                                ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm dark:border-blue-500 dark:bg-blue-950/60 dark:text-blue-300"
                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-[#0b1728] dark:text-slate-300"
                            }`}
                          >
                            <div
                              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                                isSelected
                                  ? "bg-blue-600 text-white"
                                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                              }`}
                            >
                              <IconComponent size={16} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-bold">
                                {item.key}
                              </p>
                              <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                                {item.label}
                              </p>
                            </div>
                            {isSelected && (
                              <Check
                                size={14}
                                className="text-blue-600 dark:text-blue-400"
                              />
                            )}
                          </button>
                        );
                      })}
                      {filteredIcons.length === 0 && (
                        <div className="col-span-full py-4 text-center text-xs font-semibold text-slate-500">
                          No matching icons found.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsEqModalOpen(false)}
                    className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={Object.keys(eqErrors).length > 0}
                    className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingEqItem
                      ? "Update Equipment Type"
                      : "Save Equipment Type"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 3: Custom Sleek Delete Confirmation Modal */}
        {deleteTarget && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#0b1728]">
              <div className="flex items-center gap-4 text-red-600">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-950/50">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Confirm Deletion
                  </h3>
                  <p className="text-xs text-slate-500">
                    Action cannot be undone
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                Are you sure you want to delete{" "}
                <span className="font-extrabold text-slate-900 dark:text-white">
                  "{deleteTarget.name}"
                </span>
                ?
              </p>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setDeleteTarget(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleConfirmDelete}
                  className="rounded-xl bg-red-600 px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Delete Permanently"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
