export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-radial-app px-5 py-10">
      <div className="w-full max-w-[420px]">{children}</div>
    </main>
  );
}
