import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SignUpForm from "../components/auth/SignUpForm";
import { MemoryRouter } from "react-router";
import React from "react";
import { vi } from "vitest";

// Mock the authService dependency using Vitest mock style
vi.mock("../services/authService", () => ({
  authService: {
    register: vi.fn(),
  },
}));

const renderSignUpForm = () => {
  return render(
    <MemoryRouter>
      <SignUpForm />
    </MemoryRouter>,
  );
};

describe("SignUpForm Component - Unit Tests (Jest)", () => {
  it("should render all company registration fields", () => {
    const { container } = renderSignUpForm();

    expect(screen.getByPlaceholderText(/john/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/doe/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/abc mining/i)).toBeDefined();
    expect(container.querySelector('input[type="tel"]')).toBeDefined();
    expect(screen.getByPlaceholderText(/company@email.com/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/enter strong password/i)).toBeDefined();
  });

  it("should validate required fields on submit click", async () => {
    renderSignUpForm();

    const submitBtn = screen.getByRole("button", { name: /create account/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeDefined();
      expect(screen.getByText(/last name is required/i)).toBeDefined();
      expect(screen.getByText(/company name is required/i)).toBeDefined();
      expect(screen.getByText(/email is required/i)).toBeDefined();
      expect(screen.getByText(/password is required/i)).toBeDefined();
    });
  });

  it("should validate first name min length requirement", async () => {
    renderSignUpForm();

    const firstNameInput = screen.getByPlaceholderText(/john/i);
    fireEvent.change(firstNameInput, { target: { value: "A" } });

    const submitBtn = screen.getByRole("button", { name: /create account/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/First name must be at least 2 characters/i)).toBeDefined();
    });
  });

  it("should validate password strength requirements", async () => {
    renderSignUpForm();

    const passwordInput = screen.getByPlaceholderText(/enter strong password/i);

    // Test case: Too short password
    fireEvent.change(passwordInput, { target: { value: "12345" } });
    const submitBtn = screen.getByRole("button", { name: /create account/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Password must be at least 8 characters/i)).toBeDefined();
    });

    // Test case: Missing uppercase/special chars (weak password)
    fireEvent.change(passwordInput, { target: { value: "weakpassword123" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(
          /Password must contain uppercase, lowercase, number and special character/i,
        ),
      ).toBeDefined();
    });
  });
});
