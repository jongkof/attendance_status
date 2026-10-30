"use client";

import { CircleAlertIcon } from "lucide-react";
import { useActionState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

type FormState = { error?: string; done?: boolean } | undefined;

export function TeamPasswordForm({
  action,
  minLength,
  status,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  minLength: number;
  status: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <Card className="w-full max-w-md">
      <form action={formAction} key={state?.done ? "done" : "form"}>
        <CardHeader>
          <CardTitle>팀 비밀번호 변경</CardTitle>
          <CardDescription>
            {status} 바꾸면 팀원은 모두 로그아웃되고 새 비밀번호로 다시 로그인해야 합니다. 관리자 로그인은 유지됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {state?.done ? (
            <Alert>
              <AlertDescription>팀 비밀번호를 바꿨습니다. 팀에 새 비밀번호를 알려 주세요.</AlertDescription>
            </Alert>
          ) : null}
          {state?.error ? (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertTitle>팀 비밀번호를 바꾸지 못했습니다</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="team-new-password">새 팀 비밀번호</FieldLabel>
              <Input id="team-new-password" name="next" type="password" autoComplete="new-password" required minLength={minLength} />
              <FieldDescription>{minLength}자 이상, 관리자 비밀번호와 다르게 정해 주세요.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="team-confirm-password">새 팀 비밀번호 확인</FieldLabel>
              <Input id="team-confirm-password" name="confirm" type="password" autoComplete="new-password" required />
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            팀 비밀번호 변경
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
