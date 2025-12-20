import { render, screen, fireEvent, waitFor } from "@/test-utils";
import NetWorthHistoryTable from "./NetWorthHistoryTable";
import { describe, it, expect, vi } from "vitest";
import React from "react";
import * as netWorthActions from "@/app/actions/networth";

// Mock Design System hooks locally to avoid Provider issues
// Mock server actions
vi.mock("@/app/actions/networth", () => ({
  updateNetWorthEntry: vi.fn(),
  deleteNetWorthEntry: vi.fn(),
  createNetWorthEntry: vi.fn(),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock Design System

describe("NetWorthHistoryTable", () => {
  const mockEntries = [
    { id: 1, date: "2024-01-01", netWorth: 10000 },
    { id: 2, date: "2024-02-01", netWorth: 11000 },
  ];

  it("should render entries", () => {
    render(<NetWorthHistoryTable entries={mockEntries} />);
    expect(screen.getByText("Net Worth History")).toBeInTheDocument();
    // Dates are formatted in the table, but our mock Table renders raw data for simplicity in checking existence
    // Wait, our mock Table renders {row.date}.
    // But the real Table uses a cell formatter.
    // In our mock Table, we are rendering `row.date` directly in the `td`.
    // So we expect '2024-01-01'.
    expect(screen.getByText("Jan 1, 2024")).toBeInTheDocument();
  });

  it("should open add modal", async () => {
    render(<NetWorthHistoryTable entries={mockEntries} />);

    // Find "Add Entry" button. It's the first button (Plus icon + text).
    const addButton = screen.getByText("Add Entry").closest("button");
    fireEvent.click(addButton!);

    await waitFor(() => {
      expect(screen.getByText("Add Net Worth Entry")).toBeInTheDocument();
    });
  });

  it("should delete entry", async () => {
    window.confirm = vi.fn(() => true);
    render(<NetWorthHistoryTable entries={mockEntries} />);

    const deleteButtons = screen.getAllByRole("button", {
      name: /Delete net worth entry/i,
    });

    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(netWorthActions.deleteNetWorthEntry).toHaveBeenCalledWith(1);
    });
  });
});
