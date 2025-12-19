import { render, screen, fireEvent } from "@/test-utils";
import AccountWizard from "./page";
import { describe, it, expect, vi } from "vitest";
import React from "react";

// Mock Design System hooks locally to avoid Provider issues
// Mock dependencies
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: vi.fn(),
  }),
}));

vi.mock("@/app/actions/accounts", () => ({
  createAccount: vi.fn(),
}));

describe("AccountWizard", () => {
  it("should render step 1", () => {
    render(<AccountWizard />);
    // Use getByRole for heading to be more specific and robust
    expect(
      screen.getByRole("heading", { name: "Add New Account" })
    ).toBeInTheDocument();

    // Manual Entry is inside a button, let's find the button or the text
    // The text is inside a div inside the button
    expect(screen.getByText("Manual Entry")).toBeInTheDocument();
  });

  it("should navigate to step 2 manual entry", () => {
    render(<AccountWizard />);

    // Select Manual Entry
    fireEvent.click(screen.getByText("Manual Entry"));

    // Click Next
    fireEvent.click(screen.getByText("Next"));

    expect(screen.getByText("Account Name")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("e.g. Chase Checking")
    ).toBeInTheDocument();
  });

  it("should show coming soon for auto import", () => {
    render(<AccountWizard />);

    expect(screen.getByText("Auto Import")).toBeInTheDocument();
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
  });
});
