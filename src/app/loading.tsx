'use client';

import { Page, Grid, Flex, Card, Skeleton } from '@design-system';

export default function Loading() {
  return (
    <Page>
      {/* Header Skeleton */}
      <Flex justify="space-between" align="center" style={{ marginBottom: '2rem', height: '4rem' }}>
        <Flex direction="column" gap="0.5rem">
          <Skeleton variant="text" width="200px" height="2rem" />
          <Skeleton variant="text" width="150px" height="1rem" />
        </Flex>
        <Flex gap="1rem">
          <Skeleton variant="circular" width="40px" height="40px" />
          <Skeleton variant="circular" width="40px" height="40px" />
        </Flex>
      </Flex>

      {/* Tabs Skeleton */}
      <div style={{ marginBottom: '2rem' }}>
        <Flex gap="0.5rem" style={{ borderBottom: 'var(--border-width) solid var(--card-border)', paddingBottom: '0.5rem' }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} variant="rectangular" width="100px" height="2.5rem" style={{ borderRadius: 'var(--radius)' }} />
          ))}
        </Flex>
      </div>

      {/* Dashboard Grid Skeleton */}
      <Grid columns="auto 1fr" gap="1.5rem">
        
        {/* Goal Tracker Skeleton */}
        <div style={{ gridColumn: '1 / -1' }}>
          <Card style={{ padding: '1.5rem' }}>
            <Flex justify="space-between" align="center" style={{ marginBottom: '1rem' }}>
              <Skeleton variant="text" width="150px" height="1.5rem" />
              <Skeleton variant="text" width="100px" height="2rem" />
            </Flex>
            <Skeleton variant="rectangular" height="1.5rem" style={{ borderRadius: '1rem' }} />
            <Flex justify="space-between" style={{ marginTop: '0.5rem' }}>
              <Skeleton variant="text" width="80px" />
              <Skeleton variant="text" width="80px" />
            </Flex>
          </Card>
        </div>

        {/* Left Column: Table Skeleton */}
        <div style={{ minWidth: 0 }}>
          <Card style={{ height: '600px', padding: '1.5rem' }}>
            <Flex justify="space-between" style={{ marginBottom: '1.5rem' }}>
              <Skeleton variant="text" width="180px" height="1.5rem" />
              <Skeleton variant="rectangular" width="120px" height="2rem" />
            </Flex>
            <Flex direction="column" gap="1rem">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Flex key={i} justify="space-between" gap="1rem">
                  <Skeleton variant="text" width="20%" />
                  <Skeleton variant="text" width="20%" />
                  <Skeleton variant="text" width="20%" />
                  <Skeleton variant="text" width="20%" />
                </Flex>
              ))}
            </Flex>
          </Card>
        </div>

        {/* Right Column: Chart & Cards Skeleton */}
        <Flex direction="column" gap="1.5rem" style={{ minWidth: 0 }}>
          
          {/* Chart Skeleton */}
          <Card style={{ height: '400px', padding: '1.5rem' }}>
            <Skeleton variant="text" width="200px" height="1.5rem" style={{ marginBottom: '1rem' }} />
            <Skeleton variant="rectangular" height="300px" />
          </Card>

          {/* Summary Cards Skeleton */}
          <Grid columns="1fr 1fr" gap="1rem">
            <Card style={{ padding: '1.5rem' }}>
              <Skeleton variant="text" width="100px" style={{ marginBottom: '0.5rem' }} />
              <Skeleton variant="text" width="140px" height="2rem" />
            </Card>
            <Card style={{ padding: '1.5rem' }}>
              <Skeleton variant="text" width="100px" style={{ marginBottom: '0.5rem' }} />
              <Skeleton variant="text" width="140px" height="2rem" />
            </Card>
            <Card style={{ padding: '1.5rem' }}>
              <Skeleton variant="text" width="100px" style={{ marginBottom: '0.5rem' }} />
              <Skeleton variant="text" width="140px" height="2rem" />
            </Card>
            <Card style={{ padding: '1.5rem' }}>
              <Skeleton variant="text" width="100px" style={{ marginBottom: '0.5rem' }} />
              <Skeleton variant="text" width="140px" height="2rem" />
            </Card>
          </Grid>

        </Flex>
      </Grid>
    </Page>
  );
}
