import { Zigzag } from "@/components/zigzag";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;

  return (
    <main className="flex flex-1 flex-col justify-center gap-8 px-4 py-10">
      <section aria-label="Sulod" className="flex flex-col">
        <div className="flex flex-col gap-3 rounded-t-[22px] bg-ink px-5 pt-6 pb-5 text-paper">
          <span className="label-mono text-mango">Sulod</span>
          <h1 className="font-display text-[40px] leading-[1.05] font-extrabold tracking-tight">
            Log money in seconds.
            <br />
            Know where it goes.
          </h1>
        </div>
        <Zigzag />
      </section>

      <LoginForm initialError={error === "link" ? "That sign-in link expired. Send a new one." : undefined} />
    </main>
  );
}
