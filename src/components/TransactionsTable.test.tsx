import { render, screen, fireEvent, waitFor } from "@/test-utils";
import TransactionsTable from "./TransactionsTable";
import { describe, it, expect, vi } from "vitest";
import React from "react";
import * as transactionActions from "@/app/actions/transactions";

// Mock Design System hooks locally to avoid Provider issues
// Mock server actions
vi.mock("@/app/actions/transactions", () => ({
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock Design System

describe("TransactionsTable", () => {
  const mockTransactions = [
    {
      id: 1,
      name: "Grocery Store",
      amount: 150.5,
      date: "2024-01-15",
      tags: "Food",
      type: "expense",
      accountId: 1,
      accountName: "Checking",
    },
    {
      id: 2,
      name: "Paycheck",
      amount: 3000,
      date: "2024-01-30",
      tags: "Salary",
      type: "income",
      accountId: 1,
      accountName: "Checking",
    },
  ];

  const mockAccounts = [
    { id: 1, name: "Checking" },
    { id: 2, name: "Savings" },
  ];

  it("should render transactions", () => {
    render(
      <TransactionsTable
        transactions={mockTransactions}
        selectedYear={2024}
        accounts={mockAccounts}
      />
    );

    expect(screen.getByText("Transactions (2024)")).toBeInTheDocument();
    expect(screen.getByText("Grocery Store")).toBeInTheDocument();
    expect(screen.getByText("Paycheck")).toBeInTheDocument();
  });

  it("should filter by account", async () => {
    render(
      <TransactionsTable
        transactions={mockTransactions}
        selectedYear={2024}
        accounts={mockAccounts}
      />
    );

    // Initial state: all transactions
    expect(screen.getByText("Grocery Store")).toBeInTheDocument();
    expect(screen.getByText("Paycheck")).toBeInTheDocument();

    // Filter by Savings (should show none since both mock transactions are "Checking")
    // Filter by Savings (should show none since both mock transactions are "Checking")
    const trigger = screen
      .getAllByRole("combobox")
      .find((el) => el.textContent?.includes("All Accounts"));
    expect(trigger).toBeDefined();
    fireEvent.click(trigger!);

    // Select the "Savings" option from the dropdown
    fireEvent.click(screen.getByText("Savings"));

    // Verify transactions are filtered out
    await waitFor(() => {
      expect(screen.queryByText("Grocery Store")).not.toBeInTheDocument();
      expect(screen.queryByText("Paycheck")).not.toBeInTheDocument();
    });

    // Filter back to Checking (should show both)
    const triggerSavings = screen
      .getAllByRole("combobox")
      .find((el) => el.textContent?.includes("Savings"));
    expect(triggerSavings).toBeDefined();
    fireEvent.click(triggerSavings!);
    fireEvent.click(screen.getByText("Checking"));

    await waitFor(() => {
      expect(screen.getByText("Grocery Store")).toBeInTheDocument();
      expect(screen.getByText("Paycheck")).toBeInTheDocument();
    });
  });

  it("should delete transaction", async () => {
    // Mock confirm
    window.confirm = vi.fn(() => true);

    render(
      <TransactionsTable
        transactions={mockTransactions}
        selectedYear={2024}
        accounts={mockAccounts}
      />
    );

    // Find all delete buttons and click the first one
    const deleteButtons = screen.getAllByRole("button", {
      name: /Delete transaction/i,
    });

    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(transactionActions.deleteTransaction).toHaveBeenCalledWith(1);
    });
  });
});
