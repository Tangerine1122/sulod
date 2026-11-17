"use client";

import { startTransition, type FormEvent } from "react";

/**
 * Submits a form to a `useActionState` action without React's automatic form reset.
 * With `<form action={...}>`, React 19 clears every uncontrolled field once the action
 * returns, including when it returns a validation error, so the person would have to
 * retype everything. Calling the action from onSubmit keeps what they typed.
 */
export function useFormSubmit(action: (form: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(() => action(form));
  };
}
