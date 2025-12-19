import { render, screen, fireEvent, waitFor } from "@/test-utils";
import IncomeBudgetPage from "./page";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import * as budgetActions from "@/app/actions/budgets";

// Mock Design System hooks locally to avoid Provider issues
// Mock dependencies
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: vi.fn(),
    push: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
}));

vi.mock("@/app/actions/budgets", () => ({
  getIncomeSources: vi.fn(),
  getBudgetsForIncomeSource: vi.fn(),
  saveIncomeBudgets: vi.fn(),
}));

describe("IncomeBudgetPage", () => {
  const mockSources = [{ id: 1, name: "Job", type: "paycheck", amount: 5000 }];
  const mockBudgets = {
    paycheckAmount: 5000,
    budgets: [
      {
        id: "1",
        name: "Savings",
        unit: "percentage",
        value: 20,
        type: "savings",
        increasesNetWorth: true,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (budgetActions.getIncomeSources as any).mockResolvedValue(mockSources);
    (budgetActions.getBudgetsForIncomeSource as any).mockResolvedValue(
      mockBudgets
    );
  });

  it("should load and display data", async () => {
    render(<IncomeBudgetPage />);

    await waitFor(() => {
      expect(screen.getByText("Income Budget")).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue("Savings")).toBeInTheDocument();
    expect(screen.getByDisplayValue("20")).toBeInTheDocument();
  });

  it("should handle save", async () => {
    render(<IncomeBudgetPage />);

    await waitFor(() => {
      expect(screen.getByText("Save Configuration")).toBeInTheDocument();
    });

    const saveButton = screen.getByText("Save Configuration").closest("button");
    fireEvent.click(saveButton!);

    await waitFor(() => {
      expect(budgetActions.saveIncomeBudgets).toHaveBeenCalled();
    });
  });
});
