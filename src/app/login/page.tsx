'use client';

import { useState } from 'react';
import { login } from '@/app/actions/auth';

import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { Button, Card, Flex, Input, Link, Page, Text } from '@design-system';
import { AlertTriangle, FlaskConical } from 'lucide-react';

const sheen = keyframes`
  0% { left: -100%; }
  20% { left: 100%; }
  100% { left: 100%; }
`;

const HeaderContainer = styled.div`
  background: var(--primary);
  color: #000000;
  padding: 1.5rem;
  border-bottom: 3px solid #000000;
  text-align: center;
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 50%;
    height: 100%;
    background: linear-gradient(
      to right,
      transparent 0%,
      rgba(255, 255, 255, 0.4) 50%,
      transparent 100%
    );
    transform: skewX(-25deg);
    animation: none;
    pointer-events: none;
  }

  &:hover::after {
    animation: ${sheen} 5s;
  }
`;

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(username, password);
      if (result?.error) {
        setError(result.error);
        setLoading(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login');
      setLoading(false);
    }
  };

  const quickLogin = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
  };

  return (
    <Page variant="fullWidth">
      <Flex 
        align="center" 
        justify="center"
        style={{
          minHeight: '100vh',
          backgroundColor: '#f3f4f6',
          backgroundImage: `
            linear-gradient(#e5e7eb 1px, transparent 1px),
            linear-gradient(90deg, #e5e7eb 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
          padding: '2rem'
        }}
      >
        <Card style={{ 
          width: '100%',
          maxWidth: '440px',
          padding: '0',
          overflow: 'hidden',
          boxShadow: '8px 8px 0px 0px #000000',
          border: '3px solid #000000'
        }}>
          {/* Header Section */}
          <HeaderContainer>
            <Flex 
              align="center" 
              justify="flex-start" 
              gap="0.75rem" 
              style={{ marginBottom: '0.5rem' }}
            >
              <Text variant="h3" weight="black" style={{ 
                color: '#000000', 
                letterSpacing: '-0.02em',
                margin: 0,
                textTransform: 'uppercase'
              }}>
                MoneyPrinter
              </Text>
            </Flex>
            <Text variant="small" style={{ color: '#000000', display: 'block', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>
              Secure Financial Terminal
            </Text>
          </HeaderContainer>

          <div style={{ padding: '2rem' }}>
            <form onSubmit={handleSubmit}>
              <Flex direction="column" gap="1.5rem" align="stretch">
                
                {error && (
                  <Flex 
                    align="center" 
                    gap="0.5rem"
                    style={{
                      padding: '0.75rem',
                      background: '#fee2e2',
                      border: '2px solid #ef4444',
                      color: '#b91c1c',
                      fontWeight: 700,
                      fontSize: '0.875rem'
                    }}
                  >
                    <AlertTriangle size={20} strokeWidth={2.5} />
                    {error.toUpperCase()}
                  </Flex>
                )}

                <Flex direction="column" gap="1.25rem">
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '0.5rem',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Username
                    </label>
                    <Input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="ENTER USERNAME"
                      required
                    />
                  </div>

                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '0.5rem',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Password
                    </label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="ENTER PASSWORD"
                      required
                    />
                  </div>
                </Flex>

                <Button
                  type="submit"
                  disabled={loading || !username || !password}
                  variant="primary"
                  size="lg"
                  style={{ width: '100%' }}
                >
                  {loading ? 'AUTHENTICATING...' : 'ACCESS TERMINAL'}
                </Button>

                <div style={{
                  borderTop: '2px dashed #e5e7eb',
                  paddingTop: '1.5rem',
                  marginTop: '0.5rem'
                }}>
                  <Flex direction="column" gap="1rem" align="center">
                    <Button
                      type="button"
                      onClick={() => quickLogin('sandbox', 'moneyprinter_sandbox')}
                      variant="outline"
                      size="sm"
                      style={{ width: '100%' }}
                    >
                      <FlaskConical size={18} strokeWidth={2.5} style={{ marginRight: '0.5rem' }} />
                      DEMO MODE
                    </Button>
                    
                    <Text variant="small" color="muted">
                      Don&apos;t have an account?{' '}
                      <Link href="/signup" variant="default">
                        Open Account
                      </Link>
                    </Text>
                  </Flex>
                </div>
              </Flex>
            </form>
          </div>
        </Card>
      </Flex>
    </Page>
  );
}
