import { render, screen, fireEvent, waitFor } from "@/test-utils";
import LoginPage from "./page";
import { describe, it, expect, vi } from "vitest";
import React from "react";
import * as authActions from "@/app/actions/auth";

// Mock Design System hooks locally to avoid Provider issues
// Mock server actions
vi.mock("@/app/actions/auth", () => ({
  login: vi.fn(),
}));

// Mock Design System

describe("LoginPage", () => {
  it("should render login form", () => {
    render(<LoginPage />);
    expect(screen.getByText("MoneyPrinter")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("ENTER USERNAME")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("ENTER PASSWORD")).toBeInTheDocument();
  });

  it("should handle login submission", async () => {
    render(<LoginPage />);

    const usernameInput = screen.getByPlaceholderText("ENTER USERNAME");
    const passwordInput = screen.getByPlaceholderText("ENTER PASSWORD");
    const submitButton = screen.getByText("ACCESS TERMINAL").closest("button");

    fireEvent.change(usernameInput, { target: { value: "testuser" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });

    fireEvent.click(submitButton!);

    await waitFor(() => {
      expect(authActions.login).toHaveBeenCalledWith("testuser", "password123");
    });
  });

  it("should handle demo mode", async () => {
    render(<LoginPage />);

    const demoButton = screen.getByText("DEMO MODE").closest("button");
    fireEvent.click(demoButton!);

    // Demo mode fills inputs. We need to check if inputs have values.
    // In our mock Input, we pass value prop.
    // Wait, the state updates, so the input value should update.

    const usernameInput = screen.getByPlaceholderText("ENTER USERNAME");
    const passwordInput = screen.getByPlaceholderText("ENTER PASSWORD");

    expect(usernameInput).toHaveValue("sandbox");
    expect(passwordInput).toHaveValue("moneyprinter_sandbox");
  });

  it("should display error on login failure", async () => {
    (authActions.login as any).mockResolvedValue({
      error: "Invalid credentials",
    });

    render(<LoginPage />);

    const usernameInput = screen.getByPlaceholderText("ENTER USERNAME");
    const passwordInput = screen.getByPlaceholderText("ENTER PASSWORD");
    const submitButton = screen.getByText("ACCESS TERMINAL").closest("button");

    fireEvent.change(usernameInput, { target: { value: "testuser" } });
    fireEvent.change(passwordInput, { target: { value: "wrongpass" } });

    fireEvent.click(submitButton!);

    await waitFor(() => {
      expect(screen.getByText("INVALID CREDENTIALS")).toBeInTheDocument();
    });
  });
});
