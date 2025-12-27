import { render, screen, fireEvent, waitFor } from "@/test-utils";
import SignupPage from "./page";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import * as authActions from "@/app/actions/auth";

// Mock Design System hooks locally to avoid Provider issues
// Mock server actions
vi.mock("@/app/actions/auth", () => ({
  signup: vi.fn(),
}));

// Mock Design System

describe("SignupPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render signup form", () => {
    render(<SignupPage />);
    expect(screen.getByText("New Account")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("CHOOSE USERNAME")).toBeInTheDocument();
  });

  it("should handle signup submission", async () => {
    render(<SignupPage />);

    const usernameInput = screen.getByPlaceholderText("CHOOSE USERNAME");
    const displayInput = screen.getByPlaceholderText("YOUR DISPLAY NAME");
    const passwordInput = screen.getByPlaceholderText("CREATE PASSWORD");
    const confirmInput = screen.getByPlaceholderText("CONFIRM PASSWORD");
    const submitButton = screen.getByText("CREATE ACCOUNT").closest("button");

    fireEvent.change(usernameInput, { target: { value: "newuser" } });
    fireEvent.change(displayInput, { target: { value: "New User" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.change(confirmInput, { target: { value: "password123" } });

    fireEvent.click(submitButton!);

    await waitFor(() => {
      expect(authActions.signup).toHaveBeenCalledWith(
        "newuser",
        "New User",
        "password123"
      );
    });
  });

  it("should show error if passwords do not match", async () => {
    render(<SignupPage />);

    const usernameInput = screen.getByPlaceholderText("CHOOSE USERNAME");
    const displayInput = screen.getByPlaceholderText("YOUR DISPLAY NAME");
    const passwordInput = screen.getByPlaceholderText("CREATE PASSWORD");
    const confirmInput = screen.getByPlaceholderText("CONFIRM PASSWORD");
    const submitButton = screen.getByText("CREATE ACCOUNT").closest("button");

    fireEvent.change(usernameInput, { target: { value: "newuser" } });
    fireEvent.change(displayInput, { target: { value: "New User" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.change(confirmInput, { target: { value: "mismatch" } });

    fireEvent.click(submitButton!);

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    });
    expect(authActions.signup).not.toHaveBeenCalled();
  });
});
