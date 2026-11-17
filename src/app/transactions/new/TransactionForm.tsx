"use client";
import { transactionTypeOptions } from '@/lib/transaction-types';

import { useState } from "react";
import RefundFields from "@/components/RefundFields";
import { useRouter, useSearchParams } from "next/navigation";
import { createTransaction } from "@/app/actions/transactions";
import { X, Receipt, Plus } from "lucide-react";
import {
  Breadcrumbs,
  BreadcrumbItem,
  Button,
  Card,
  Flex,
  Form,
  FormGroup,
  Input,
  Label,
  Page,
  RadioGroup,
  RadioGroupItem,
  Select,
  Text,
} from "doom-design-system";

interface Account {
  id: number;
  name: string;
}

interface TransactionFormProps {
  accounts: Account[];
}

export default function TransactionForm({ accounts }: TransactionFormProps) {
  const [type, setType] = useState("expense");
  const [accountId, setAccountId] = useState<number | null>(null);
  const [tags, setTags] = useState("");
  const [amount, setAmount] = useState(0);
  const router = useRouter();
  const searchParams = useSearchParams();
  const year = searchParams.get("year");

  const handleCancel = () => {
    if (year) {
      router.push(`/?tab=transactions&year=${year}`);
    } else {
      router.back();
    }
  };

  const accountOptions = accounts.map((acc) => ({
    value: acc.id,
    label: acc.name,
  }));

  return (
    <Page>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <Breadcrumbs className="mb-6">
          <BreadcrumbItem href="/">Dashboard</BreadcrumbItem>
          <BreadcrumbItem href="/?tab=transactions">
            Transactions
          </BreadcrumbItem>
          <BreadcrumbItem isCurrent>New Transaction</BreadcrumbItem>
        </Breadcrumbs>
        <header style={{ marginBottom: "2rem", position: "relative" }}>
          <Button
            variant="ghost"
            onClick={handleCancel}
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              padding: "0.5rem",
              fontSize: "1.25rem",
              lineHeight: 1,
            }}
            aria-label="Close"
          >
            <X size={20} strokeWidth={2.5} />
          </Button>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                background: "var(--primary)",
                color: "var(--primary-foreground)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "8px",
                fontSize: "1.5rem",
                margin: "0 auto 1rem auto",
                border: "var(--surface-border-width) solid var(--card-border)",
                boxShadow: "var(--shadow-md)",
              }}
            >
              <Receipt size={24} strokeWidth={2.5} />
            </div>
            <Text variant="h1" align="center" className="mb-2">
              Add Transaction
            </Text>
            <Text color="muted" align="center">
              Record income, spending, a refund, or an account payment
            </Text>
          </div>
        </header>

        <Card>
          <Form action={createTransaction}>
            <input type="hidden" name="year" value={year || ""} />
            <FormGroup>
              <Label>Type</Label>
              <RadioGroup name="type" value={type} onValueChange={setType}>
                {transactionTypeOptions.map(o => <RadioGroupItem key={o.value} value={o.value}>{o.label}</RadioGroupItem>)}
              </RadioGroup>
            </FormGroup>

            <FormGroup>
              <Label>Description</Label>
              <Input
                name="name"
                type="text"
                placeholder="e.g. Grocery Store, Salary, Rent"
                required
              />
            </FormGroup>

            <FormGroup>
              <Label>Amount</Label>
              <Input
                name="amount"
                onChange={e => setAmount(Number(e.target.value))}
                type="number"
                step="0.01"
                placeholder="0.00"
                required
                startAdornment="$"
              />
            </FormGroup>

            <FormGroup>
              <Label>Date</Label>
              <Input
                name="date"
                type="date"
                required
                defaultValue={new Date().toISOString().split("T")[0]}
              />
            </FormGroup>

            <FormGroup>
              <Label>Tags</Label>
              <Input
                name="tags"
                value={tags}
                onChange={e => setTags(e.target.value)}
                type="text"
                placeholder="e.g. Food, Housing, Transport"
              />
            </FormGroup>

            <FormGroup>
              <Label>Account</Label>
              <Select
                name="accountId"
                aria-label="Account"
                onChange={e => setAccountId(Number(e.target.value))}
                required
                options={accountOptions}
                style={{ width: "100%" }}
              />
            </FormGroup>

            {type === "refund" && <RefundFields accountId={accountId} amount={amount} onCopyTags={setTags} />}

            <Flex justify="space-between" className="mt-8">
              <Button type="button" variant="ghost" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                <Plus
                  size={16}
                  strokeWidth={2.5}
                  style={{ marginRight: "0.5rem" }}
                />
                Add Transaction
              </Button>
            </Flex>
          </Form>
        </Card>
      </div>
    </Page>
  );
}
