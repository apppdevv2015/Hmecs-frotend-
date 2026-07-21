import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SignInForm from "../components/auth/SignInForm";
import { MemoryRouter } from "react-router";
import React from "react";
import { vi } from "vitest";

// Mock the authService dependency using Vitest mock style
vi.mock("../services/authService", () => ({
  authService: {
    login: vi.fn(),
    clearAuthStorage: vi.fn(),
    getRedirectPathByRole: vi.fn(),
  },
  normalizeRole: vi.fn((role) => role),
}));

const renderSignInForm = () => {
  return render(
    <MemoryRouter>
      <SignInForm />
    </MemoryRouter>,
  );
};

describe("SignInForm Component - Unit Tests (Jest)", () => {
  it("should render email and password input fields and submit button", () => {
    renderSignInForm();

    expect(screen.getByPlaceholderText(/enter your email/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/enter your password/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeDefined();
  });

  it("should show validation error message on empty form submit", async () => {
    renderSignInForm();

    const submitBtn = screen.getByRole("button", { name: /sign in/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Email is required/i)).toBeDefined();
      expect(screen.getByText(/Password is required/i)).toBeDefined();
    });
  });

  it("should show specific error message on invalid email formats", async () => {
    renderSignInForm();

    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    fireEvent.change(emailInput, { target: { value: "not-an-email" } });

    const submitBtn = screen.getByRole("button", { name: /sign in/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Please enter a valid email address/i)).toBeDefined();
    });
  });

  it("should toggle password input visibility when eye icon is clicked", () => {
    renderSignInForm();

    const passwordInput = screen.getByPlaceholderText(/enter your password/i) as HTMLInputElement;
    const toggleBtn = screen.getByRole("button", { name: /show password/i });

    expect(passwordInput.type).toBe("password");
    fireEvent.click(toggleBtn);
    expect(passwordInput.type).toBe("text");
  });
});
