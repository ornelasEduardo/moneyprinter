import { render, screen } from '@/test-utils';
import TransactionForm from "./TransactionForm";
import { describe, it, expect, vi } from "vitest";
import React from "react";

// Mock Design System hooks locally to avoid Provider issues
// Mock dependencies
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: vi.fn(),
    push: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn((key) => {
      if (key === "year") return "2024";
      return null;
    }),
  }),
}));

vi.mock("@/app/actions/transactions", () => ({
  createTransaction: vi.fn(),
}));

describe("TransactionForm", () => {
  const mockAccounts = [
    { id: 1, name: "Checking" },
    { id: 2, name: "Savings" },
  ];

  it("should render form with accounts", () => {
    render(<TransactionForm accounts={mockAccounts} />);

    expect(
      screen.getByRole("heading", { name: "Add Transaction" })
    ).toBeInTheDocument();

    // Check for form fields by their placeholders
    expect(
      screen.getByPlaceholderText(/Grocery Store, Salary, Rent/i)
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("0.00")).toBeInTheDocument();

    // Check that submit button exists
    expect(
      screen.getByRole("button", { name: /Add Transaction/i })
    ).toBeInTheDocument();
  });
});
