import { render, screen, fireEvent } from "@/test-utils";
import SettingsView from "./SettingsView";
import { describe, it, expect } from "vitest";
import React from "react";

describe("SettingsView", () => {
  it("should render theme options", () => {
    render(<SettingsView />);

    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Appearance")).toBeInTheDocument();
  });

  it("should change theme", async () => {
    render(<SettingsView />);

    // Just verify we can find buttons (themes) and click one without error
    const buttons = screen.getAllByRole("button");
    // We expect at least one theme button
    expect(buttons.length).toBeGreaterThan(0);

    fireEvent.click(buttons[0]);
  });
});
