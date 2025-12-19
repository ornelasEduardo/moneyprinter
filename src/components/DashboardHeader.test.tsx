import { render, screen, fireEvent } from "@/test-utils";
import DashboardHeader from "./DashboardHeader";
import { describe, it, expect, vi } from "vitest";
import React from "react";
import * as authActions from "@/app/actions/auth";
import * as store from "@/lib/store";

// Mock Design System hooks locally to avoid Provider issues
// Mock server actions
vi.mock("@/app/actions/auth", () => ({
  logout: vi.fn(),
}));

// Mock Design System

// Mock store
vi.mock("@/lib/store", () => ({
  useDashboardStore: vi.fn(),
}));

describe("DashboardHeader", () => {
  it("should render header with user info", () => {
    (store.useDashboardStore as any).mockImplementation((selector: any) => {
      const state = {
        user: { display_name: "Test User", is_sandbox: false },
        availableYears: [2023, 2024],
      };
      return selector(state);
    });

    render(<DashboardHeader selectedYear={2024} onYearChange={() => {}} />);

    expect(screen.getByText("MoneyPrinter")).toBeInTheDocument();
    expect(screen.getByText("Test User")).toBeInTheDocument();
  });

  it("should handle year change", () => {
    (store.useDashboardStore as any).mockImplementation((selector: any) => {
      const state = {
        user: { display_name: "Test User", is_sandbox: false },
        availableYears: [2023, 2024],
      };
      return selector(state);
    });

    const handleYearChange = vi.fn();
    render(
      <DashboardHeader selectedYear={2024} onYearChange={handleYearChange} />
    );

    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveTextContent("2024");
    fireEvent.click(trigger);
    fireEvent.click(screen.getByText("2023"));

    expect(handleYearChange).toHaveBeenCalledWith(2023);
  });

  it("should call logout", () => {
    (store.useDashboardStore as any).mockImplementation((selector: any) => {
      const state = {
        user: { display_name: "Test User", is_sandbox: false },
        availableYears: [2023, 2024],
      };
      return selector(state);
    });

    render(<DashboardHeader selectedYear={2024} onYearChange={() => {}} />);

    const logoutButton = screen.getByText("Logout").closest("button");
    fireEvent.click(logoutButton!);

    expect(authActions.logout).toHaveBeenCalled();
  });
});
