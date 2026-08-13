import { useEffect, useMemo, useRef, useState } from "react";
import type { CountryCode } from "libphonenumber-js";
import { ChevronDown, Search } from "lucide-react";

import { getCountries, getCountryCallingCode, parsePhoneNumberFromString } from "libphonenumber-js";

import en from "react-phone-number-input/locale/en.json";

export interface PhoneFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  defaultCountry?: CountryCode;
}

export interface CountryOption {
  value: CountryCode;
  label: string;
  code: CountryCode;
  callingCode: string;
  flag: string;
}

const countryToFlag = (countryCode: CountryCode) =>
  countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));

const buildCountries = (): CountryOption[] => {
  return getCountries()
    .map((country) => ({
      value: country,
      code: country,
      label: en[country] || country,
      callingCode: `+${getCountryCallingCode(country)}`,
      flag: countryToFlag(country),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

const validatePhoneNumber = (value: string, country: CountryCode): string | undefined => {
  if (!value.trim()) {
    return "Phone number is required";
  }

  try {
    const phoneNumber = parsePhoneNumberFromString(value, country);

    if (!phoneNumber) {
      return "Please enter a valid phone number.";
    }

    if (!phoneNumber.isValid()) {
      const countryName = en[country as keyof typeof en] ?? country;

      return `Please enter a valid phone number for ${countryName}.`;
    }

    return undefined;
  } catch {
    return "Please enter a valid phone number.";
  }
};

export default function PhoneField({
  value,
  onChange,
  error,
  label = "Mobile Number",
  required = false,
  disabled = false,
  placeholder = "Enter phone number",
  defaultCountry = "ZA",
}: PhoneFieldProps) {
  const countries = useMemo(() => buildCountries(), []);

  const initialCountry = countries.find((c) => c.value === defaultCountry) || countries[0];

  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(initialCountry);

  const [isTouched, setIsTouched] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [search, setSearch] = useState("");

  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const derivedError = useMemo(() => {
    if (!value?.trim()) {
      return isTouched ? "Phone number is required" : undefined;
    }

    const phoneNumber = parsePhoneNumberFromString(value, selectedCountry.value);

    if (!phoneNumber?.nationalNumber || phoneNumber.nationalNumber.length < 6) {
      return undefined;
    }

    return validatePhoneNumber(value, selectedCountry.value);
  }, [isTouched, selectedCountry.value, value]);

  const currentError = error || derivedError;

  const filteredCountries = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return countries;

    return countries.filter(
      (c) =>
        c.label.toLowerCase().includes(query) ||
        c.code.toLowerCase().includes(query) ||
        c.callingCode.includes(query),
    );
  }, [countries, search]);

  // Menu khulte hi search input ko focus karo
  useEffect(() => {
    if (isMenuOpen) {
      searchInputRef.current?.focus();
    }
  }, [isMenuOpen]);

  // Bahar click / Escape pe menu band karo
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
        setSearch("");
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
        setSearch("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMenuOpen]);

  const toggleMenu = () => {
    if (disabled) return;

    setIsMenuOpen((prev) => {
      const next = !prev;
      if (!next) setSearch("");
      return next;
    });
  };

  const handleCountrySelect = (option: CountryOption) => {
    setSelectedCountry(option);
    setIsMenuOpen(false);
    setSearch("");
  };

  const handlePhoneChange = (phone?: string) => {
    const phoneValue = phone?.trim() || "";

    if (phoneValue === value) {
      return;
    }

    onChange(phoneValue);
  };

  const handleBlur = () => {
    setIsTouched(true);
  };

  return (
    <div className="w-full">
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        {label}

        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <div ref={wrapperRef} className="relative w-full">
        <div
          className={`flex h-10 w-full items-stretch overflow-hidden rounded-lg border bg-white transition-all duration-200 dark:bg-[#101f33]
          ${
            currentError
              ? "border-red-400"
              : "border-slate-300 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 dark:border-slate-700"
          }`}
        >
          {/* Country Trigger */}
          <button
            type="button"
            disabled={disabled}
            onClick={toggleMenu}
            aria-haspopup="listbox"
            aria-expanded={isMenuOpen}
            className="flex shrink-0 items-center gap-1.5 px-3 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="inline-flex h-3.5 w-5 items-center justify-center overflow-hidden rounded-[3px] text-base leading-none">
              {selectedCountry.flag}
            </span>

            <ChevronDown
              className={`h-3.5 w-3.5 text-slate-500 transition-transform duration-200 ${
                isMenuOpen ? "rotate-180" : ""
              }`}
              strokeWidth={2.5}
            />
          </button>

          {/* Divider */}
          <div className="my-2 w-px shrink-0 bg-slate-200 dark:bg-slate-700" />

          {/* Phone Number */}
          <div className="flex min-w-0 flex-1 items-center px-3">
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={value || ""}
              onChange={(event) => handlePhoneChange(event.target.value)}
              onBlur={handleBlur}
              placeholder={placeholder}
              className="w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
            />
          </div>
        </div>

        {/* Country Dropdown Panel */}
        {isMenuOpen && (
          <div
            role="listbox"
            className="absolute left-0 top-[calc(100%+6px)] z-[999999] w-[350px] max-w-[90vw] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.15)] dark:border-slate-700 dark:bg-[#101f33]"
          >
            <div className="sticky top-0 border-b border-slate-100 bg-white p-2 dark:border-slate-700 dark:bg-[#101f33]">
              <div className="flex items-center gap-2 rounded-md border border-slate-200 px-2.5 py-1.5 focus-within:border-blue-400 dark:border-slate-600">
                <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search country..."
                  className="w-full border-0 bg-transparent text-sm outline-none placeholder:text-slate-400 dark:text-white"
                />
              </div>
            </div>

            <div className="max-h-[150px] overflow-y-auto py-1.5">
              {filteredCountries.length === 0 ? (
                <p className="px-3.5 py-4 text-center text-sm text-slate-400">No country found</p>
              ) : (
                filteredCountries.map((c) => (
                  <button
                    type="button"
                    key={c.value}
                    role="option"
                    aria-selected={c.value === selectedCountry.value}
                    onClick={() => handleCountrySelect(c)}
                    className={`flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors ${
                      c.value === selectedCountry.value ? "bg-blue-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="inline-flex h-3.5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-[3px] text-base leading-none">
                        {c.flag}
                      </span>

                      <span className="truncate text-sm text-slate-700">{c.label}</span>
                    </div>

                    <span className="shrink-0 text-sm font-medium text-slate-500">
                      {c.callingCode}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-1 min-h-[18px]">
        <p
          className={`text-[11px] font-medium leading-4 ${
            currentError ? "text-red-500" : "text-transparent"
          }`}
        >
          {currentError || "."}
        </p>
      </div>
    </div>
  );
}
