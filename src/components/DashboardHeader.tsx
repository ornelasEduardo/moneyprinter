"use client";

import { Logo } from "@/components/Logo";
import { logout } from "@/app/actions/auth";
import { useDashboardStore } from "@/lib/store";
import { Button, Flex, Select, Text } from "doom-design-system";
import { User, LogOut, FlaskConical } from "lucide-react";

interface DashboardHeaderProps {
  selectedYear: number;
  onYearChange: (year: string) => void;
}

export default function DashboardHeader({
  selectedYear,
  onYearChange,
}: DashboardHeaderProps) {
  const user = useDashboardStore((state) => state.user);
  const availableYears = useDashboardStore((state) => state.availableYears);

  return (
    <Flex
      justify="space-between"
      align="center"
      className="relative z-40 mb-10"
    >
      <Flex gap={4} align="center">
        <Logo size={48} />
        <Text variant="h1" className="uppercase" style={{ margin: 0 }}>
          MoneyPrinter
        </Text>

        <div className="w-32">
          <Select
            value={selectedYear}
            onChange={(e) => onYearChange(e.target.value)}
            options={[...availableYears]
              .sort((a, b) => a - b)
              .map((year) => ({ value: year, label: year.toString() }))}
          />
        </div>
      </Flex>

      <Flex gap={4} align="center">
        {user && (
          <Flex
            align="center"
            gap={2}
            style={{
              padding: "0.5rem 1rem",
              border: "var(--border-width) solid var(--card-border)",
              borderRadius: "var(--radius)",
              backgroundColor: user.is_sandbox
                ? "var(--warning)"
                : "var(--primary)",
              color: user.is_sandbox ? "#000000" : "var(--primary-foreground)",
            }}
          >
            {user.is_sandbox ? (
              <FlaskConical size={18} strokeWidth={2.5} />
            ) : (
              <User size={18} strokeWidth={2.5} />
            )}
            <Text weight="bold" style={{ color: "inherit" }}>
              {user.display_name}
            </Text>
          </Flex>
        )}

        <Button variant="secondary" onClick={() => logout()}>
          <LogOut size={18} strokeWidth={2.5} />
          <span>Logout</span>
        </Button>
      </Flex>
    </Flex>
  );
}
