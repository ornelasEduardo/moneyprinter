import { Card, Flex, Grid, ProgressBar, Text } from "doom-design-system";

interface SummaryCardsProps {
  netWorth: number;
  yearlySpending: number;
  spendingPercentage: number;
  budget: number;
  upcomingWindfalls: any[];
  year: number;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function SummaryCards({
  netWorth,
  yearlySpending,
  spendingPercentage,
  budget,
  upcomingWindfalls,
  year,
}: SummaryCardsProps) {
  return (
    <Grid columns="repeat(auto-fit, minmax(250px, 1fr))" gap="1.5rem">
      {/* Net Worth Card */}
      <Card>
        <Text variant="h6" color="muted" className="mb-2">
          Total Net Worth
        </Text>
        <Text variant="h2" color="primary">
          {formatCurrency(netWorth)}
        </Text>
      </Card>

      {/* Yearly Spending Card */}
      <Card>
        <Text variant="h6" color="muted" className="mb-2">
          {year} Spending
        </Text>
        <Text variant="h2" weight="bold">
          {formatCurrency(yearlySpending)}
        </Text>
        <div className="mt-2">
          <Flex justify="space-between" className="mb-1">
            <Text variant="small">
              {spendingPercentage.toFixed(0)}% of budget
            </Text>
            <Text variant="small">{formatCurrency(budget)}</Text>
          </Flex>
          <ProgressBar
            value={spendingPercentage}
            color={spendingPercentage > 100 ? "var(--error)" : "var(--primary)"}
            height="12px"
          />
        </div>
      </Card>

      {/* Upcoming Windfalls Card */}
      <Card>
        <Text variant="h6" color="muted" className="mb-2">
          Upcoming Windfalls
        </Text>
        <Flex direction="column" gap="0.75rem">
          {upcomingWindfalls.length > 0 ? (
            upcomingWindfalls.map((windfall, i) => (
              <Flex key={i} justify="space-between" align="center">
                <Flex direction="column">
                  <Text weight="medium">{windfall.name}</Text>
                  <Text variant="small" color="muted">
                    {new Date(windfall.date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    • {windfall.type}
                  </Text>
                </Flex>
                <Text weight="bold" color="success">
                  +{formatCurrency(windfall.amount)}
                </Text>
              </Flex>
            ))
          ) : (
            <Text variant="small" color="muted" className="italic">
              No upcoming windfalls
            </Text>
          )}
        </Flex>
      </Card>
    </Grid>
  );
}
