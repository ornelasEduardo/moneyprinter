import { render, screen } from "@/test-utils";
import SummaryCards from "./SummaryCards";
import { describe, it, expect, vi } from "vitest";
import React from "react";

// Mock Design System hooks locally to avoid Provider issues
// Mock Design System components

describe("SummaryCards", () => {
  const defaultProps = {
    netWorth: 100000,
    yearlySpending: 24000,
    spendingPercentage: 50,
    budget: 48000,
    upcomingWindfalls: [],
    year: 2024,
  };

  it("should render net worth correctly", () => {
    render(<SummaryCards {...defaultProps} />);
    expect(screen.getByText("Total Net Worth")).toBeInTheDocument();
    expect(screen.getByText("$100,000")).toBeInTheDocument();
  });

  it("should render yearly spending and budget", () => {
    render(<SummaryCards {...defaultProps} />);
    expect(screen.getByText("2024 Spending")).toBeInTheDocument();
    expect(screen.getByText("$24,000")).toBeInTheDocument();
    expect(screen.getByText("50% of budget")).toBeInTheDocument();
    expect(screen.getByText("$48,000")).toBeInTheDocument();

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-valuenow", "50");
  });

  it("should render empty windfalls message", () => {
    render(<SummaryCards {...defaultProps} />);
    expect(screen.getByText("Upcoming Windfalls")).toBeInTheDocument();
    expect(screen.getByText("No upcoming windfalls")).toBeInTheDocument();
  });

  it("should render windfalls list", () => {
    const propsWithWindfalls = {
      ...defaultProps,
      upcomingWindfalls: [
        { name: "Bonus", amount: 5000, date: "2024-12-25", type: "bonus" },
      ],
    };

    render(<SummaryCards {...propsWithWindfalls} />);
    expect(screen.getByText("Bonus")).toBeInTheDocument();
    expect(screen.getByText("+$5,000")).toBeInTheDocument();
  });
});
