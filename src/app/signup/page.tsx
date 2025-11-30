'use client';

import { useState } from 'react';
import { signup } from '@/app/actions/auth';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { Button, Card, Flex, Input, Link, Page, Text } from '@design-system';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

const sheen = keyframes`
  0% { left: -100%; }
  20% { left: 100%; }
  100% { left: 100%; }
`;

const HeaderContainer = styled.div`
  background: var(--primary);
  color: var(--primary-foreground);
  padding: 1.5rem;
  border-bottom: var(--border-width) solid var(--card-border);
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

export default function SignupPage() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const result = await signup(username, displayName, password);
      if (result?.error) {
        setError(result.error);
        setLoading(false);
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError('An error occurred during signup');
      setLoading(false);
    }
  };

  return (
    <Page variant="fullWidth">
      <Flex 
        align="center" 
        justify="center"
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--background)',
          backgroundImage: `
            linear-gradient(var(--muted) 1px, transparent 1px),
            linear-gradient(90deg, var(--muted) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
          padding: '2rem'
        }}
      >
        <Card style={{ 
          width: '100%',
          maxWidth: '500px',
          padding: '0',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-hard)',
          border: 'var(--border-width) solid var(--card-border)'
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
                color: 'var(--primary-foreground)', 
                letterSpacing: '-0.02em',
                margin: 0,
                textTransform: 'uppercase'
              }}>
                New Account
              </Text>
            </Flex>
            <Text variant="small" style={{ color: 'var(--primary-foreground)', display: 'block', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>
              Initialize Financial Profile
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
                      background: 'color-mix(in srgb, var(--error), transparent 90%)',
                      border: 'var(--border-width) solid var(--error)',
                      color: 'var(--error)',
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
                      placeholder="CHOOSE USERNAME"
                      required
                      minLength={3}
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
                      Display Name
                    </label>
                    <Input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="YOUR DISPLAY NAME"
                      required
                      minLength={2}
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
                      placeholder="CREATE PASSWORD"
                      required
                      minLength={6}
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
                      Confirm Password
                    </label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="CONFIRM PASSWORD"
                      required
                      minLength={6}
                    />
                  </div>
                </Flex>

                <Button
                  type="submit"
                  disabled={loading || !username || !displayName || !password || !confirmPassword}
                  variant="primary"
                  size="lg"
                  style={{ width: '100%' }}
                >
                  {loading ? 'INITIALIZING...' : 'CREATE ACCOUNT'}
                </Button>

                <div style={{
                  borderTop: '2px dashed var(--muted)',
                  paddingTop: '1.5rem',
                  marginTop: '0.5rem',
                  textAlign: 'center'
                }}>
                  <Link 
                    href="/login" 
                    variant="subtle"
                  >
                    <ArrowLeft size={18} strokeWidth={2.5} style={{ marginRight: '0.5rem' }} />
                    Return to Terminal
                  </Link>
                </div>
              </Flex>
            </form>
          </div>
        </Card>
      </Flex>
    </Page>
  );
}
