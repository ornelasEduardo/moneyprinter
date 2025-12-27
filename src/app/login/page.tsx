"use client";

import { useState } from "react";
import { login } from "@/app/actions/auth";

import {
  Alert,
  Button,
  Card,
  Flex,
  Input,
  Link,
  Page,
  Text,
} from "doom-design-system";
import { FlaskConical } from "lucide-react";
import styles from "./Login.module.scss";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await login(username, password);
      if (result?.error) {
        setError(result.error);
        setLoading(false);
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("An error occurred during login");
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
        className={styles.loginPageBackground}
      >
        <Card className={styles.loginCard}>
          {/* Header Section */}
          <div className={styles.loginHeaderContainer}>
            <Flex
              align="center"
              justify="flex-start"
              gap={3}
              style={{ marginBottom: "0.5rem" }}
            >
              <Text
                variant="h3"
                weight="black"
                className={styles.loginHeaderTitle}
              >
                MoneyPrinter
              </Text>
            </Flex>
            <Text variant="small" className={styles.loginHeaderSubtitle}>
              Your Personal Financial Terminal
            </Text>
          </div>

          <div className={styles.loginFormPadding}>
            <form onSubmit={handleSubmit}>
              <Flex direction="column" gap={6} align="stretch">
                {error && (
                  <Alert
                    variant="error"
                    title="LOGIN FAILED"
                    description={error}
                  />
                )}

                <Flex direction="column" gap={5}>
                  <Input
                    label="Username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ENTER USERNAME"
                    required
                  />

                  <Input
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="ENTER PASSWORD"
                    required
                  />
                </Flex>

                <Button
                  type="submit"
                  disabled={loading || !username || !password}
                  variant="primary"
                  size="lg"
                  style={{ width: "100%" }}
                >
                  {loading ? "AUTHENTICATING..." : "ACCESS TERMINAL"}
                </Button>

                <div className={styles.loginSeparator}>
                  <Flex direction="column" gap={4} align="center">
                    <Button
                      type="button"
                      onClick={() =>
                        quickLogin("sandbox", "moneyprinter_sandbox")
                      }
                      variant="outline"
                      size="sm"
                      style={{ width: "100%" }}
                    >
                      <FlaskConical
                        size={18}
                        strokeWidth={2.5}
                        style={{ marginRight: "0.5rem" }}
                      />
                      DEMO MODE
                    </Button>

                    <Text variant="small" color="muted">
                      Don&apos;t have an account?{" "}
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
