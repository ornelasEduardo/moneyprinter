import { render, screen, fireEvent, waitFor } from "@/test-utils";
import AccountsTable from "./AccountsTable";
import { describe, it, expect, vi } from "vitest";
import React from "react";
import * as accountActions from "@/app/actions/accounts";

// Mock server actions
vi.mock("@/app/actions/accounts", () => ({
  updateAccount: vi.fn(),
  deleteAccount: vi.fn(),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("AccountsTable", () => {
  const mockAccounts = [
    {
      id: 1,
      name: "Checking",
      type: "checking",
      balance: 5000,
      currency: "USD",
      last_updated: "2024-01-01T12:00:00Z",
    },
    {
      id: 2,
      name: "Savings",
      type: "savings",
      balance: 10000,
      currency: "USD",
      last_updated: "2024-01-01T12:00:00Z",
    },
  ];

  it("should render accounts", () => {
    render(<AccountsTable accounts={mockAccounts} />);

    expect(screen.getByText("Accounts")).toBeInTheDocument();
    expect(screen.getByText("Checking")).toBeInTheDocument();
    expect(screen.getByText("Savings")).toBeInTheDocument();
  });

  it("should delete account", async () => {
    render(<AccountsTable accounts={mockAccounts} />);

    // Find all delete buttons and click the first one
    const deleteButtons = screen.getAllByRole("button", {
      name: /Delete account/i,
    });
    fireEvent.click(deleteButtons[0]);

    // Wait for dialog and click confirm
    const confirmButton = await screen.findByRole("button", { name: "Delete" });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(accountActions.deleteAccount).toHaveBeenCalledWith(1);
    });
  });

  it("should open edit modal", async () => {
    render(<AccountsTable accounts={mockAccounts} />);

    // Find all edit buttons and click the first one
    const editButtons = screen.getAllByRole("button", {
      name: /Edit account/i,
    });
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Edit Account")).toBeInTheDocument();
    });
    expect(screen.getByText("Edit Account")).toBeInTheDocument();

    // Check form fields by placeholder or value since we don't have labeled inputs easily accessible
    expect(screen.getByPlaceholderText("e.g. Chase Checking")).toHaveValue(
      "Checking"
    );
  });
});
