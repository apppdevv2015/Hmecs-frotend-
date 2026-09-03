import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, X, Loader2 } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useEffect } from "react";


function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}




export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export interface CustomSelectProps {
  
  options: readonly SelectOption[];

  value?: string;
 
  defaultValue?: string;

  onChange?: (value: string) => void;

  placeholder?: string;
  label?: string;
  helperText?: string;
  errorMessage?: string;
  error?: boolean;

  loading?: boolean;
  disabled?: boolean;
  required?: boolean;
  fullWidth?: boolean;
  clearable?: boolean;

  searchable?: boolean;
  searchPlaceholder?: string;

  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;

  className?: string;
  triggerClassName?: string;
  contentClassName?: string;

  name?: string;
  id?: string;
  "aria-label"?: string;
}


const CustomSelect = React.memo(
  React.forwardRef<HTMLButtonElement, CustomSelectProps>(function CustomSelect(
    {
      options,
      value,
      defaultValue,
      onChange,
      placeholder = "Select...",
      label,
      helperText,
      errorMessage,
      error = false,
      loading = false,
      disabled = false,
      required = false,
      fullWidth = true,
      clearable = false,
      searchable = false,
      searchPlaceholder = "Search...",
      leftIcon,
      rightIcon,
      className,
      triggerClassName,
      contentClassName,
      name,
      id,
      "aria-label": ariaLabel,
    },
    ref,
  ) {
    const generatedId = React.useId();
    const selectId = id ?? generatedId;
    const helperId = `${selectId}-helper`;
    const errorId = `${selectId}-error`;

    const [searchTerm, setSearchTerm] = React.useState("");

    const isControlled = value !== undefined;
    const hasError = error || Boolean(errorMessage);
    const isDisabled = disabled || loading;

  
  
    const filteredOptions = React.useMemo(() => {
      if (!searchable || searchTerm.trim() === "") return options;
      const term = searchTerm.trim().toLowerCase();
      return options.filter((opt) => opt.label.toLowerCase().includes(term));
    }, [options, searchable, searchTerm]);

    const selectedOption = React.useMemo(() => {
  if (!value) return undefined;
  return options.find((opt) => opt.value === value);
}, [options, value]);

    const handleClear = React.useCallback(
      (e: React.SyntheticEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onChange?.("");
      },
      [onChange],
    );


    




    const showClear =
      clearable && !isDisabled && Boolean(selectedOption?.value);

    return (
      <div
        className={cn(
          fullWidth ? "w-full" : "inline-block",
          "flex flex-col gap-1.5",
          className,
        )}
      >
        {label && (
          <label
            htmlFor={selectId}
            className="text-sm font-medium text-gray-700 dark:text-gray-200 select-none"
          >
            {label}
            {required && <span className="ms-0.5 text-red-500">*</span>}
          </label>
        )}

        <SelectPrimitive.Root
          value={value}
          defaultValue={defaultValue}
          onValueChange={onChange}
          disabled={isDisabled}
          required={required}
          name={name}
        >
          <SelectPrimitive.Trigger
            ref={ref}
            id={selectId}
            aria-label={ariaLabel ?? label}
            aria-invalid={hasError || undefined}
            aria-describedby={
              cn(helperText && helperId, hasError && errorId) || undefined
            }
            className={cn(
              "touch-manipulation",
              "flex min-h-11 w-full items-center justify-between gap-2 rounded-lg",
              "px-4 text-sm sm:text-[15px]",
              "border bg-white dark:bg-gray-900 shadow-sm",
              "text-gray-700 dark:text-gray-200",
              // Placeholder state
              "data-[placeholder]:text-gray-400 dark:data-[placeholder]:text-gray-500",
              // Border / focus / hover — color + outline so it reads in high-contrast mode too
              !hasError && [
                "border-gray-300 dark:border-gray-700",
                "hover:border-blue-400 dark:hover:border-blue-500",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500",
              ],
              hasError && [
                "border-red-400 dark:border-red-600",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500",
              ],
              // Disabled
              "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-gray-300",
              "transition-colors duration-150",
              triggerClassName,
            )}
          >
            <span className="flex min-w-0 flex-1 items-center gap-2">
              {leftIcon && (
                <span className="shrink-0 text-gray-400 dark:text-gray-500">
                  {leftIcon}
                </span>
              )}
              <SelectPrimitive.Value
                placeholder={placeholder}
                className="truncate"
              />
            </span>

            <span className="flex shrink-0 items-center gap-1">
              {loading && (
                <Loader2
                  className="h-4 w-4 animate-spin text-gray-400"
                  aria-hidden
                />
              )}

              {!loading && showClear && (
                <span
                  role="button"
                  tabIndex={-1}
                  aria-label="Clear selection"
                  onPointerDown={handleClear}
                  className="rounded p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-3.5 w-3.5" />
                </span>
              )}

              {!loading &&
                (rightIcon ?? (
                  <SelectPrimitive.Icon asChild>
                    <ChevronDown
                      className="h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform duration-200 data-[state=open]:rotate-180"
                      aria-hidden
                    />
                  </SelectPrimitive.Icon>
                ))}
            </span>
          </SelectPrimitive.Trigger>

          <SelectPrimitive.Portal>
            <SelectPrimitive.Content
              position="popper"
              sideOffset={6}
              collisionPadding={8}
              avoidCollisions
              className={cn(
                "z-[1000000] overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700",
                "bg-white dark:bg-gray-900 shadow-lg",
                "min-w-[var(--radix-select-trigger-width)] w-[var(--radix-select-trigger-width)] max-w-full",
                "max-h-[min(20rem,var(--radix-select-content-available-height))]",
                // Open/close animation (requires the `tailwindcss-animate` plugin)
                "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
                "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
                contentClassName,
              )}
            >
              {searchable && (
                <div className="border-b border-gray-100 dark:border-gray-800 p-1.5">
                  <input
                    autoFocus
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    placeholder={searchPlaceholder}
                    className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1.5 text-sm text-gray-700 dark:text-gray-200 outline-none focus:border-blue-400"
                  />
                </div>
              )}

              <SelectPrimitive.ScrollUpButton className="flex h-6 items-center justify-center bg-white dark:bg-gray-900 text-gray-500">
                <ChevronDown className="h-4 w-4 rotate-180" aria-hidden />
              </SelectPrimitive.ScrollUpButton>

              <SelectPrimitive.Viewport className="max-h-60 overflow-y-auto p-1">
                {filteredOptions.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">
                    No results found
                  </div>
                ) : (
                  filteredOptions.map((option) => (
                    <SelectPrimitive.Item
                      key={option.value}
                      value={option.value}
                      disabled={option.disabled}
                      className={cn(
                        "relative flex cursor-pointer select-none items-center gap-2 rounded-md",
                        "py-2 ps-8 pe-3 text-sm sm:text-[15px] text-gray-700 dark:text-gray-200",
                        "outline-none",
                        "data-[highlighted]:bg-blue-50 dark:data-[highlighted]:bg-blue-900/30",
                        "data-[highlighted]:text-blue-700 dark:data-[highlighted]:text-blue-300",
                        "data-[state=checked]:font-medium",
                        "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40",
                      )}
                    >
                      <SelectPrimitive.ItemIndicator className="absolute start-2 inline-flex items-center">
                        <Check className="h-4 w-4 text-blue-600" aria-hidden />
                      </SelectPrimitive.ItemIndicator>
                      {option.icon && (
                        <span className="shrink-0">{option.icon}</span>
                      )}
                      <SelectPrimitive.ItemText>
                        {option.label}
                      </SelectPrimitive.ItemText>
                    </SelectPrimitive.Item>
                  ))
                )}
              </SelectPrimitive.Viewport>

              <SelectPrimitive.ScrollDownButton className="flex h-6 items-center justify-center bg-white dark:bg-gray-900 text-gray-500">
                <ChevronDown className="h-4 w-4" aria-hidden />
              </SelectPrimitive.ScrollDownButton>
            </SelectPrimitive.Content>
          </SelectPrimitive.Portal>
        </SelectPrimitive.Root>

        {helperText && !hasError && (
          <p id={helperId} className="text-xs text-gray-500 dark:text-gray-400">
            {helperText}
          </p>
        )}
        {hasError && errorMessage && (
          <p
            id={errorId}
            role="alert"
            className="text-xs text-red-500 dark:text-red-400"
          >
            {errorMessage}
          </p>
        )}
      </div>
    );
  }),
);
CustomSelect.displayName = "CustomSelect";

export default CustomSelect;
