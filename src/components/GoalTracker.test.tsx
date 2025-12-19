import { render, screen, fireEvent, waitFor } from "@/test-utils";
import { GoalTracker } from "./GoalTracker";
import { describe, it, expect, vi } from "vitest";
import React from "react";
import * as goalActions from "@/app/actions/goals";

// Mock Design System hooks locally to avoid Provider issues
// Mock server actions
vi.mock("@/app/actions/goals", () => ({
  updatePrimaryGoal: vi.fn(),
  updateEmergencyFundAmount: vi.fn(),
}));

// Mock Design System components

describe("GoalTracker", () => {
  const defaultProps = {
    netWorth: 50000,
    monthlySavings: 2000,
    goal: { name: "Retirement", target_amount: 1000000 },
    emergencyFund: 10000,
  };

  it("should render view mode correctly", () => {
    render(<GoalTracker {...defaultProps} />);

    expect(screen.getByText("Goal Tracker: Retirement")).toBeInTheDocument();
    expect(screen.getByText("TO REACH GOAL")).toBeInTheDocument();

    // 50k net worth - 10k emergency = 40k available
    // 1M target - 40k = 960k remaining
    // 960k / 2k monthly = 480 months = 40 years
    expect(screen.getByText(/40 YEARS/)).toBeInTheDocument();
  });

  it("should switch to edit mode", () => {
    render(<GoalTracker {...defaultProps} />);

    // Find edit button (the pencil icon button)
    const editButton = screen.getByRole("button", { name: /Edit Goal/i });
    fireEvent.click(editButton);

    expect(screen.getByText("Edit Goal Settings")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Retirement")).toBeInTheDocument();
    expect(screen.getByDisplayValue("1000000")).toBeInTheDocument();
    expect(screen.getByDisplayValue("10000")).toBeInTheDocument();
  });

  it("should save changes", async () => {
    render(<GoalTracker {...defaultProps} />);

    // Enter edit mode
    // Enter edit mode
    fireEvent.click(screen.getByRole("button", { name: /Edit Goal/i }));

    // Change values
    fireEvent.change(screen.getByDisplayValue("Retirement"), {
      target: { value: "New Goal" },
    });
    fireEvent.change(screen.getByDisplayValue("1000000"), {
      target: { value: "2000000" },
    });

    // Save
    const saveButton = screen.getByText("Save Changes");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(goalActions.updatePrimaryGoal).toHaveBeenCalledWith(
        "New Goal",
        2000000
      );
      expect(goalActions.updateEmergencyFundAmount).toHaveBeenCalledWith(10000); // Unchanged
    });
  });
});
