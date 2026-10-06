"use client";

export default function GlobalError({ reset }: Readonly<{ error: Error; reset: () => void }>) {
  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <section>
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-zinc-500">EventGate</p>
        <h1 className="mt-3 text-3xl font-bold">Something went wrong.</h1>
        <button className="mt-6 rounded-md bg-zinc-900 px-4 py-2 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900" onClick={reset}>
          Try again
        </button>
      </section>
    </main>
  );
}
