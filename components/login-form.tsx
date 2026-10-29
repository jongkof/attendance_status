"use client";

import { CircleAlertIcon } from "lucide-react";
import { useActionState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

type FormState = { error?: string } | undefined;

export function LoginForm({
  action,
  next,
  notice,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  next: string;
  notice?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <Card className="w-full max-w-sm">
      <form action={formAction}>
        <CardHeader>
          <CardTitle>관리자 로그인</CardTitle>
          <CardDescription>근태 관리자만 쓸 수 있는 화면입니다. 관리자 비밀번호를 입력해 주세요.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {notice ? (
            <Alert>
              <AlertDescription>{notice}</AlertDescription>
            </Alert>
          ) : null}
          {state?.error ? (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertTitle>로그인하지 못했습니다</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}
          <input type="hidden" name="next" value={next} />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="admin-password">비밀번호</FieldLabel>
              <Input id="admin-password" name="password" type="password" autoComplete="current-password" autoFocus required />
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            로그인
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
