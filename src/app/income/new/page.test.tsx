import { render, screen } from "@/test-utils";
import AddIncomePage from "./page";
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
    get: vi.fn(),
  }),
}));

vi.mock("@/app/actions/income", () => ({
  createIncomeSource: vi.fn(),
}));

describe("AddIncomePage", () => {
  it("should render form", () => {
    render(<AddIncomePage />);
    // Use getByRole for heading
    expect(
      screen.getByRole("heading", { name: "Add Income Source" })
    ).toBeInTheDocument();

    expect(screen.getByText("Income Name")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("e.g. Salary, Freelance, RSUs")
    ).toBeInTheDocument();
  });
});
