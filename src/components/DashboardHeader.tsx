"use client";

import { Logo } from "@/components/Logo";
import { logout } from "@/app/actions/auth";
import { useDashboardStore } from "@/lib/store";
import { Button, Flex, Select, Text } from "doom-design-system";
import { User, LogOut, FlaskConical } from "lucide-react";
import styled from "@emotion/styled";

const HeaderContainer = styled(Flex)`
  position: relative;
  z-index: 40;
  margin-bottom: 1.5rem;

  @media (min-width: 768px) {
    margin-bottom: 2.5rem;
  }
`;

const YearSelectWrapper = styled.div`
  width: 100%;

  @media (min-width: 768px) {
    width: 8rem;
  }
`;

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
    <HeaderContainer justify="space-between" align="center" wrap={true} gap={4}>
      <Flex gap={4} align="center" wrap={true}>
        <Logo size={48} />
        <Text variant="h1" className="uppercase" style={{ margin: 0 }}>
          MoneyPrinter
        </Text>

        <YearSelectWrapper>
          <Select
            value={selectedYear}
            onChange={(e) => onYearChange(e.target.value)}
            options={[...availableYears]
              .sort((a, b) => a - b)
              .map((year) => ({ value: year, label: year.toString() }))}
          />
        </YearSelectWrapper>
      </Flex>

      <Flex gap={4} align="center" wrap={true}>
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
    </HeaderContainer>
  );
}
