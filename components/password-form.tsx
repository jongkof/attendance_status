"use client";

import { CircleAlertIcon } from "lucide-react";
import { useActionState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

type FormState = { error?: string } | undefined;

export function PasswordForm({
  action,
  minLength,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  minLength: number;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <Card className="w-full max-w-md">
      <form action={formAction}>
        <CardHeader>
          <CardTitle>비밀번호 변경</CardTitle>
          <CardDescription>
            바꾸면 로그인한 모든 곳에서 로그아웃되고, 새 비밀번호로 다시 로그인해야 합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {state?.error ? (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertTitle>비밀번호를 바꾸지 못했습니다</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="current-password">현재 비밀번호</FieldLabel>
              <Input id="current-password" name="current" type="password" autoComplete="current-password" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="new-password">새 비밀번호</FieldLabel>
              <Input id="new-password" name="next" type="password" autoComplete="new-password" required minLength={minLength} />
              <FieldDescription>{minLength}자 이상으로 정해 주세요.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-password">새 비밀번호 확인</FieldLabel>
              <Input id="confirm-password" name="confirm" type="password" autoComplete="new-password" required />
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            비밀번호 변경
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
