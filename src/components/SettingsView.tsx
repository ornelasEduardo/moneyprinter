"use client";

import React from "react";
import { Text, Card, useTheme, ThemeKey } from "doom-design-system";
import styles from "./SettingsView.module.scss";

export default function SettingsView() {
  const { theme: currentTheme, setTheme, availableThemes } = useTheme();

  return (
    <div className={styles.settingsContainer}>
      <Text variant="h2">Settings</Text>

      <Card className={styles.section}>
        <div>
          <Text variant="h4" className="mb-2">
            Appearance
          </Text>
          <Text color="muted">
            Choose the visual theme for your Money Printer.
          </Text>
        </div>

        <div className={styles.themeGrid}>
          {Object.entries(availableThemes).map(([key, theme]) => (
            <button
              key={key}
              className={`${styles.themeCard} ${
                currentTheme === key ? styles.active : ""
              }`}
              onClick={() => setTheme(key as ThemeKey)}
            >
              <Text weight="bold" variant="h6">
                {theme.name}
              </Text>

              <div className={styles.previewSwatch}>
                <div style={{ background: theme.variables["--background"] }} />
                <div style={{ background: theme.variables["--card-bg"] }} />
                <div style={{ background: theme.variables["--primary"] }} />
                <div style={{ background: theme.variables["--secondary"] }} />
                <div style={{ background: theme.variables["--accent"] }} />
              </div>

              <Text variant="small" color="muted">
                {key === "doom"
                  ? "Authoritative & Regal"
                  : key === "neighbor"
                  ? "Bold & Heroic"
                  : key === "vigilante"
                  ? "Dark & Mysterious"
                  : "The MONEYPRINTER"}
              </Text>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
