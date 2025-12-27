"use client";

import { useState } from "react";
import { signup } from "@/app/actions/auth";
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
import { ArrowLeft } from "lucide-react";
import styles from "./Signup.module.scss";

export default function SignupPage() {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
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
      console.error("Signup error:", err);
      setError("An error occurred during signup");
      setLoading(false);
    }
  };

  return (
    <Page variant="fullWidth">
      <Flex align="center" justify="center" className={styles.pageBackground}>
        <Card className={styles.card}>
          {/* Header Section */}
          <div className={styles.headerContainer}>
            <Flex
              align="center"
              justify="flex-start"
              gap={3}
              style={{ marginBottom: "0.5rem" }}
            >
              <Text variant="h3" weight="black" className={styles.headerTitle}>
                New Account
              </Text>
            </Flex>
            <Text variant="small" className={styles.headerSubtitle}>
              Initialize Financial Profile
            </Text>
          </div>

          <div className={styles.formPadding}>
            <form onSubmit={handleSubmit}>
              <Flex direction="column" gap={6} align="stretch">
                {error && (
                  <Alert
                    variant="error"
                    title="SIGNUP FAILED"
                    description={error}
                  />
                )}

                <Flex direction="column" gap={5}>
                  <Input
                    label="Username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="CHOOSE USERNAME"
                    required
                    minLength={3}
                  />

                  <Input
                    label="Display Name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="YOUR DISPLAY NAME"
                    required
                    minLength={2}
                  />

                  <Input
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="CREATE PASSWORD"
                    required
                    minLength={6}
                  />

                  <Input
                    label="Confirm Password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="CONFIRM PASSWORD"
                    required
                    minLength={6}
                  />
                </Flex>

                <Button
                  type="submit"
                  disabled={
                    loading ||
                    !username ||
                    !displayName ||
                    !password ||
                    !confirmPassword
                  }
                  variant="primary"
                  size="lg"
                  style={{ width: "100%" }}
                >
                  {loading ? "INITIALIZING..." : "CREATE ACCOUNT"}
                </Button>

                <div className={styles.separator}>
                  <Link href="/login" variant="subtle">
                    <ArrowLeft
                      size={18}
                      strokeWidth={2.5}
                      style={{ marginRight: "0.5rem" }}
                    />
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
